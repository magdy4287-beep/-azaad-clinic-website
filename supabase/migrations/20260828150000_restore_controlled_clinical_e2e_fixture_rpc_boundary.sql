create or replace function public.clinic_prepare_controlled_clinical_e2e_suite(p_actor_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_staff_id uuid;
  v_role text;
  v_doctor_a uuid;
  v_doctor_b uuid;
  v_service_id uuid;
  v_patient_id uuid;
  v_happy_id uuid;
  v_invalid_id uuid;
  v_suffix text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
begin
  if p_actor_user_id is null then raise exception 'E2E_ACTOR_REQUIRED' using errcode='22023'; end if;
  select id, upper(role) into v_staff_id, v_role from public.clinic_staff where auth_user_id = p_actor_user_id and active = true limit 1;
  if v_staff_id is null or v_role not in ('OWNER','ADMIN','SECRETARY','RECEPTION','RECEPTIONIST','CASHIER') then raise exception 'E2E_FIXTURE_NOT_AUTHORIZED' using errcode='42501'; end if;
  select doctor_id into v_doctor_a from public.clinic_staff where username='doctor_lamia' and role='DOCTOR' and active=true and doctor_id is not null limit 1;
  if v_doctor_a is null then raise exception 'E2E_DOCTOR_A_NOT_CONFIGURED'; end if;
  select doctor_id into v_doctor_b from public.clinic_staff where username='doctor_amgad' and role='DOCTOR' and active=true and doctor_id is not null limit 1;
  if v_doctor_b is null then raise exception 'E2E_DOCTOR_B_NOT_CONFIGURED'; end if;
  select id into v_service_id from public.clinic_services where name='جلسة علاج نفسي فردية' and active=true and price is not null and price>=0 limit 1;
  if v_service_id is null then raise exception 'E2E_SERVICE_NOT_CONFIGURED'; end if;
  insert into public.clinic_patients (mrn,patient_name,patient_phone,patient_phone_normalized,patient_email,notes,active,marital_status,residence)
  values ('E2E-'||v_suffix,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local','CONTROLLED_E2E_FIXTURE — synthetic patient; created by clinical authorization E2E suite factory',true,'single','CONTROLLED_E2E') returning id into v_patient_id;
  insert into public.clinic_bookings (booking_code,doctor_id,service_id,patient_name,patient_phone,patient_email,appointment_date,appointment_time,mode,notes,status,patient_language,patient_id,payment_status,service_authorization_status)
  values ('E2E-HAPPY-'||v_suffix,v_doctor_b,v_service_id,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local',current_date+1,time '10:00','clinic','CONTROLLED_E2E_FIXTURE — synthetic booking; authorized clinical path','confirmed','ar',v_patient_id,'unpaid','authorized') returning id into v_happy_id;
  insert into public.clinic_bookings (booking_code,doctor_id,service_id,patient_name,patient_phone,patient_email,appointment_date,appointment_time,mode,notes,status,patient_language,patient_id,payment_status,service_authorization_status)
  values ('E2E-INVALID-'||v_suffix,v_doctor_a,v_service_id,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local',current_date+1,time '11:00','clinic','CONTROLLED_E2E_FIXTURE — synthetic booking; invalid workflow state test','confirmed','ar',v_patient_id,'unpaid','authorized') returning id into v_invalid_id;
  return jsonb_build_object('happy_path_booking_id',v_happy_id,'wrong_doctor_booking_id',v_happy_id,'invalid_state_booking_id',v_invalid_id,'doctor_a_id',v_doctor_a,'doctor_b_id',v_doctor_b,'patient_id',v_patient_id);
end;
$$;
revoke all on function public.clinic_prepare_controlled_clinical_e2e_suite(uuid) from public, anon, authenticated;
grant execute on function public.clinic_prepare_controlled_clinical_e2e_suite(uuid) to service_role;
