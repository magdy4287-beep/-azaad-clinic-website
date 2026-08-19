-- AZAAD: one canonical patient-demographics mutation boundary.
-- Secretary/Cashier/Admin/Owner/Manager may edit demographics.
-- Doctors may edit only patients linked to their own bookings/clinical visits.
-- The function remains the audited mutation path and keeps the MRN immutable.

CREATE OR REPLACE FUNCTION private.clinic_update_patient_demographics(
  p_patient_id uuid,
  p_patient_name text,
  p_patient_phone text,
  p_patient_email text,
  p_date_of_birth date,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_gender text DEFAULT NULL,
  p_marital_status text DEFAULT NULL,
  p_residence text DEFAULT NULL
)
RETURNS public.clinic_patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
declare
  v_actor uuid := auth.uid(); v_role text; v_staff public.clinic_staff%rowtype;
  v_old public.clinic_patients%rowtype; v_new public.clinic_patients%rowtype;
  v_old_height numeric; v_old_weight numeric; v_username text; v_profile_id uuid; v_changed jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_staff from public.clinic_staff where auth_user_id=v_actor and coalesce(active,is_active,true)=true limit 1;
  v_role := upper(coalesce(v_staff.role,''));
  if v_role not in ('SECRETARY','CASHIER','ADMIN','OWNER','MANAGER','DOCTOR') then raise exception 'PATIENT_EDIT_FORBIDDEN'; end if;
  if v_role='DOCTOR' and not exists (
    select 1 from public.clinic_bookings b where b.patient_id=p_patient_id and b.doctor_id=v_staff.doctor_id
    union all select 1 from public.clinic_clinical_visits v where v.patient_id=p_patient_id and v.doctor_id=v_staff.doctor_id
  ) then raise exception 'PATIENT_EDIT_SCOPE_DENIED'; end if;
  if length(trim(coalesce(p_patient_name,'')))=0 or array_length(regexp_split_to_array(trim(p_patient_name),'\s+'),1)<3 then raise exception 'PATIENT_NAME_REQUIRES_THREE_PARTS'; end if;
  if nullif(trim(coalesce(p_patient_phone,'')),'') is null then raise exception 'PATIENT_PHONE_REQUIRED'; end if;
  if p_gender is not null and p_gender not in ('male','female') then raise exception 'INVALID_GENDER'; end if;
  if p_marital_status is not null and p_marital_status not in ('single','married','divorced','widowed') then raise exception 'INVALID_MARITAL_STATUS'; end if;
  if p_height_cm is not null and (p_height_cm<30 or p_height_cm>250) then raise exception 'INVALID_HEIGHT'; end if;
  if p_weight_kg is not null and (p_weight_kg<1 or p_weight_kg>500) then raise exception 'INVALID_WEIGHT'; end if;
  select * into v_old from public.clinic_patients where id=p_patient_id for update; if not found then raise exception 'PATIENT_NOT_FOUND'; end if;
  select height_cm,weight_kg,id into v_old_height,v_old_weight,v_profile_id from public.clinic_patient_medical_profiles where patient_id=p_patient_id limit 1;
  update public.clinic_patients set patient_name=trim(p_patient_name),patient_phone=trim(p_patient_phone),patient_phone_normalized=regexp_replace(trim(p_patient_phone),'\D','','g'),patient_email=nullif(trim(p_patient_email),''),date_of_birth=p_date_of_birth,gender=p_gender,marital_status=p_marital_status,residence=nullif(trim(p_residence),''),updated_at=now() where id=p_patient_id returning * into v_new;
  if v_profile_id is null then insert into public.clinic_patient_medical_profiles(patient_id,height_cm,weight_kg,updated_by) values(p_patient_id,p_height_cm,p_weight_kg,v_actor); else update public.clinic_patient_medical_profiles set height_cm=p_height_cm,weight_kg=p_weight_kg,updated_by=v_actor,updated_at=now() where id=v_profile_id; end if;
  v_username:=v_staff.username;
  v_changed=jsonb_build_object('patient_name',v_old.patient_name is distinct from v_new.patient_name,'patient_phone',v_old.patient_phone is distinct from v_new.patient_phone,'patient_email',v_old.patient_email is distinct from v_new.patient_email,'date_of_birth',v_old.date_of_birth is distinct from v_new.date_of_birth,'gender',v_old.gender is distinct from v_new.gender,'marital_status',v_old.marital_status is distinct from v_new.marital_status,'residence',v_old.residence is distinct from v_new.residence,'height_cm',v_old_height is distinct from p_height_cm,'weight_kg',v_old_weight is distinct from p_weight_kg);
  insert into public.clinic_patient_profile_audit(patient_id,actor_user_id,actor_username,changed_fields,before_data,after_data) values(p_patient_id,v_actor,v_username,v_changed,jsonb_build_object('patient_name',v_old.patient_name,'patient_phone',v_old.patient_phone,'patient_email',v_old.patient_email,'date_of_birth',v_old.date_of_birth,'gender',v_old.gender,'marital_status',v_old.marital_status,'residence',v_old.residence,'height_cm',v_old_height,'weight_kg',v_old_weight),jsonb_build_object('patient_name',v_new.patient_name,'patient_phone',v_new.patient_phone,'patient_email',v_new.patient_email,'date_of_birth',v_new.date_of_birth,'gender',v_new.gender,'marital_status',v_new.marital_status,'residence',v_new.residence,'height_cm',p_height_cm,'weight_kg',p_weight_kg));
  return v_new;
end;
$$;

CREATE OR REPLACE FUNCTION public.clinic_update_patient_demographics(p_patient_id uuid,p_patient_name text,p_patient_phone text,p_patient_email text,p_date_of_birth date,p_height_cm numeric,p_weight_kg numeric,p_gender text DEFAULT NULL,p_marital_status text DEFAULT NULL,p_residence text DEFAULT NULL)
RETURNS public.clinic_patients LANGUAGE sql SET search_path TO 'public','pg_catalog'
AS $$ SELECT * FROM private.clinic_update_patient_demographics(p_patient_id,p_patient_name,p_patient_phone,p_patient_email,p_date_of_birth,p_height_cm,p_weight_kg,p_gender,p_marital_status,p_residence); $$;

REVOKE ALL ON FUNCTION public.clinic_update_patient_demographics(uuid,text,text,text,date,numeric,numeric,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinic_update_patient_demographics(uuid,text,text,text,date,numeric,numeric,text,text,text) TO authenticated;
