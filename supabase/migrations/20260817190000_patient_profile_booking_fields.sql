alter table public.clinic_patients add column if not exists gender text;
alter table public.clinic_patients add column if not exists marital_status text;
alter table public.clinic_patients add column if not exists residence text;

alter table public.clinic_patients drop constraint if exists clinic_patients_gender_check;
alter table public.clinic_patients add constraint clinic_patients_gender_check check (gender is null or gender in ('male','female'));
alter table public.clinic_patients drop constraint if exists clinic_patients_marital_status_check;
alter table public.clinic_patients add constraint clinic_patients_marital_status_check check (marital_status is null or marital_status in ('single','married','divorced','widowed'));

create or replace function public.clinic_update_patient_demographics(
  p_patient_id uuid,
  p_patient_name text,
  p_patient_phone text,
  p_patient_email text,
  p_date_of_birth date,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_gender text default null,
  p_marital_status text default null,
  p_residence text default null
) returns public.clinic_patients
language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_actor uuid:=auth.uid(); v_role text; v_old public.clinic_patients%rowtype; v_new public.clinic_patients%rowtype; v_username text; v_profile_id uuid; v_changed jsonb;
begin
 if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
 select role into v_role from public.clinic_staff where auth_user_id=v_actor and coalesce(active,is_active,true)=true limit 1;
 if v_role is null or v_role not in ('SECRETARY','CASHIER','ADMIN','OWNER','DOCTOR') then raise exception 'PATIENT_EDIT_FORBIDDEN'; end if;
 if length(trim(coalesce(p_patient_name,'')))=0 or array_length(regexp_split_to_array(trim(p_patient_name),'\s+'),1)<3 then raise exception 'PATIENT_NAME_REQUIRES_THREE_PARTS'; end if;
 if nullif(trim(coalesce(p_patient_phone,'')),'') is null then raise exception 'PATIENT_PHONE_REQUIRED'; end if;
 if p_gender is not null and p_gender not in ('male','female') then raise exception 'INVALID_GENDER'; end if;
 if p_marital_status is not null and p_marital_status not in ('single','married','divorced','widowed') then raise exception 'INVALID_MARITAL_STATUS'; end if;
 if p_height_cm is not null and (p_height_cm<30 or p_height_cm>250) then raise exception 'INVALID_HEIGHT'; end if;
 if p_weight_kg is not null and (p_weight_kg<1 or p_weight_kg>500) then raise exception 'INVALID_WEIGHT'; end if;
 select * into v_old from public.clinic_patients where id=p_patient_id for update; if not found then raise exception 'PATIENT_NOT_FOUND'; end if;
 update public.clinic_patients set patient_name=trim(p_patient_name),patient_phone=trim(p_patient_phone),patient_phone_normalized=regexp_replace(trim(p_patient_phone),'\D','','g'),patient_email=nullif(trim(p_patient_email),''),date_of_birth=p_date_of_birth,gender=p_gender,marital_status=p_marital_status,residence=nullif(trim(p_residence),''),updated_at=now() where id=p_patient_id returning * into v_new;
 select id into v_profile_id from public.clinic_patient_medical_profiles where patient_id=p_patient_id limit 1;
 if v_profile_id is null then insert into public.clinic_patient_medical_profiles(patient_id,height_cm,weight_kg,updated_by) values(p_patient_id,p_height_cm,p_weight_kg,v_actor); else update public.clinic_patient_medical_profiles set height_cm=p_height_cm,weight_kg=p_weight_kg,updated_by=v_actor,updated_at=now() where id=v_profile_id; end if;
 select username into v_username from public.clinic_staff where auth_user_id=v_actor limit 1;
 v_changed=jsonb_build_object('patient_name',v_old.patient_name is distinct from v_new.patient_name,'patient_phone',v_old.patient_phone is distinct from v_new.patient_phone,'patient_email',v_old.patient_email is distinct from v_new.patient_email,'date_of_birth',v_old.date_of_birth is distinct from v_new.date_of_birth,'gender',v_old.gender is distinct from v_new.gender,'marital_status',v_old.marital_status is distinct from v_new.marital_status,'residence',v_old.residence is distinct from v_new.residence);
 insert into public.clinic_patient_profile_audit(patient_id,actor_user_id,actor_username,changed_fields,before_data,after_data) values(p_patient_id,v_actor,v_username,v_changed,jsonb_build_object('patient_name',v_old.patient_name,'patient_phone',v_old.patient_phone,'patient_email',v_old.patient_email,'date_of_birth',v_old.date_of_birth,'gender',v_old.gender,'marital_status',v_old.marital_status,'residence',v_old.residence),jsonb_build_object('patient_name',v_new.patient_name,'patient_phone',v_new.patient_phone,'patient_email',v_new.patient_email,'date_of_birth',v_new.date_of_birth,'gender',v_new.gender,'marital_status',v_new.marital_status,'residence',v_new.residence,'height_cm',p_height_cm,'weight_kg',p_weight_kg));
 return v_new;
end; $$;

revoke all on function public.clinic_update_patient_demographics(uuid,text,text,text,date,numeric,numeric,text,text,text) from public,anon,authenticated;
grant execute on function public.clinic_update_patient_demographics(uuid,text,text,text,date,numeric,numeric,text,text,text) to authenticated;
