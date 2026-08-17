create or replace function public.clinic_prepare_controlled_clinical_e2e_fixture()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_staff_id uuid;
  v_role text;
  v_doctor_id uuid;
  v_service_id uuid;
  v_patient_id uuid;
  v_booking_id uuid;
  v_suffix text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
begin
  select id, upper(role)
    into v_staff_id, v_role
  from public.clinic_staff
  where auth_user_id = auth.uid()
    and active = true
  limit 1;

  if v_staff_id is null or v_role not in ('OWNER','ADMIN','RECEPTION','RECEPTIONIST','CASHIER') then
    raise exception 'E2E_FIXTURE_NOT_AUTHORIZED' using errcode='42501';
  end if;

  select doctor_id into v_doctor_id
  from public.clinic_staff
  where username = 'doctor_amgad'
    and role = 'DOCTOR'
    and active = true
    and doctor_id is not null
  limit 1;

  if v_doctor_id is null then
    raise exception 'E2E_DOCTOR_B_NOT_CONFIGURED';
  end if;

  select id into v_service_id
  from public.clinic_services
  where name = 'جلسة علاج نفسي فردية'
    and active = true
    and price is not null
    and price >= 0
  limit 1;

  if v_service_id is null then
    raise exception 'E2E_SERVICE_NOT_CONFIGURED';
  end if;

  insert into public.clinic_patients (
    mrn, patient_name, patient_phone, patient_phone_normalized,
    patient_email, gender, notes, active, marital_status, residence
  ) values (
    'E2E-' || v_suffix,
    'AZAAD E2E Clinical Fixture ' || v_suffix,
    'E2E' || v_suffix,
    'E2E' || v_suffix,
    'azaad-e2e-' || lower(v_suffix) || '@invalid.local',
    'other',
    'CONTROLLED_E2E_FIXTURE — synthetic patient; created by clinical authorization E2E fixture factory',
    true,
    'single',
    'CONTROLLED_E2E'
  ) returning id into v_patient_id;

  insert into public.clinic_bookings (
    booking_code, doctor_id, service_id, patient_name, patient_phone,
    patient_email, appointment_date, appointment_time, mode, notes,
    status, patient_language, patient_id, payment_status, service_authorization_status
  ) values (
    'E2E-' || v_suffix,
    v_doctor_id,
    v_service_id,
    'AZAAD E2E Clinical Fixture ' || v_suffix,
    'E2E' || v_suffix,
    'azaad-e2e-' || lower(v_suffix) || '@invalid.local',
    current_date + 1,
    time '10:00',
    'in_person',
    'CONTROLLED_E2E_FIXTURE — synthetic booking; safe for authorization E2E only',
    'confirmed',
    'ar',
    v_patient_id,
    'unpaid',
    'authorized'
  ) returning id into v_booking_id;

  return jsonb_build_object('booking_id', v_booking_id, 'doctor_id', v_doctor_id, 'patient_id', v_patient_id);
end;
$$;

revoke execute on function public.clinic_prepare_controlled_clinical_e2e_fixture() from public, anon;
grant execute on function public.clinic_prepare_controlled_clinical_e2e_fixture() to authenticated;
