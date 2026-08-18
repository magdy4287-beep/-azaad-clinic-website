-- Controlled clinical E2E fixture hardening.
-- Keep the fixture aligned with the real doctor scheduling source of truth,
-- seed only the two dedicated E2E doctors, and avoid stale synthetic bookings.

create or replace function public.clinic_prepare_controlled_clinical_e2e_suite()
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_staff_id uuid; v_role text; v_doctor_a uuid; v_doctor_b uuid; v_service_id uuid; v_patient_id uuid;
  v_happy_id uuid; v_invalid_id uuid; v_happy_date date; v_happy_time time; v_invalid_date date; v_invalid_time time;
  v_duration_minutes integer; v_suffix text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_cairo_date date := timezone('Africa/Cairo', now())::date;
begin
  perform pg_advisory_xact_lock(hashtext('azaad:controlled_clinical_e2e_fixture_factory'));
  select id, upper(role) into v_staff_id, v_role from public.clinic_staff where auth_user_id=auth.uid() and active=true limit 1;
  if v_staff_id is null or v_role not in ('OWNER','ADMIN','SECRETARY','RECEPTION','RECEPTIONIST','CASHIER') then raise exception 'E2E_FIXTURE_NOT_AUTHORIZED' using errcode='42501'; end if;
  select doctor_id into v_doctor_a from public.clinic_staff where username='doctor_lamia' and role='DOCTOR' and active=true and doctor_id is not null limit 1;
  if v_doctor_a is null then raise exception 'E2E_DOCTOR_A_NOT_CONFIGURED'; end if;
  select doctor_id into v_doctor_b from public.clinic_staff where username='doctor_amgad' and role='DOCTOR' and active=true and doctor_id is not null limit 1;
  if v_doctor_b is null then raise exception 'E2E_DOCTOR_B_NOT_CONFIGURED'; end if;
  select id, greatest(coalesce(duration_minutes,60),1) into v_service_id,v_duration_minutes from public.clinic_services where name='جلسة علاج نفسي فردية' and active=true and price is not null and price>=0 limit 1;
  if v_service_id is null then raise exception 'E2E_SERVICE_NOT_CONFIGURED'; end if;

  update public.clinic_bookings set status='cancelled' where (booking_code like 'E2E-HAPPY-%' or booking_code like 'E2E-INVALID-%') and status in ('pending','confirmed');
  update public.clinic_patients set active=false where notes like 'CONTROLLED_E2E_FIXTURE%';

  insert into public.doctor_weekly_schedules (doctor_id,weekday,enabled,start_time,end_time,break_start,break_end,slot_minutes,buffer_minutes,max_daily_bookings,mode)
  select v_doctor_a,weekday,enabled,start_time,end_time,break_start,break_end,30,0,null,'both' from public.clinic_working_hours on conflict (doctor_id,weekday) do nothing;
  insert into public.doctor_weekly_schedules (doctor_id,weekday,enabled,start_time,end_time,break_start,break_end,slot_minutes,buffer_minutes,max_daily_bookings,mode)
  select v_doctor_b,weekday,enabled,start_time,end_time,break_start,break_end,30,0,null,'both' from public.clinic_working_hours on conflict (doctor_id,weekday) do nothing;
  update public.clinic_doctors set services=array_append(coalesce(services,'{}'::text[]),v_service_id::text) where id in (v_doctor_a,v_doctor_b) and not (v_service_id::text=any(coalesce(services,'{}'::text[])));

  select candidate_date,candidate_time into v_happy_date,v_happy_time from (
    select v_cairo_date+d as candidate_date,(ds.start_time+s*interval '30 minutes')::time candidate_time,ds.start_time,ds.end_time,ds.break_start,ds.break_end,ds.enabled,coalesce(ds.buffer_minutes,0) buffer_minutes
    from generate_series(1,60) d join public.doctor_weekly_schedules ds on ds.doctor_id=v_doctor_b and ds.weekday=extract(dow from (v_cairo_date+d))::integer cross join generate_series(0,48) s where ds.mode in ('both','clinic','in_clinic')
  ) slots where enabled and candidate_time>=start_time and candidate_time+make_interval(mins=>v_duration_minutes)<=end_time
    and (break_start is null or break_end is null or candidate_time+make_interval(mins=>v_duration_minutes)<=break_start or candidate_time>=break_end)
    and not exists(select 1 from public.clinic_holidays h where h.closed and (h.applies_to in ('clinic','all') or (h.applies_to='doctor' and h.doctor_id=v_doctor_b)) and candidate_date between h.start_date and h.end_date)
    and not exists(select 1 from public.doctor_schedule_overrides o where o.doctor_id=v_doctor_b and o.override_date=candidate_date and o.type in ('closed','off','unavailable','holiday'))
    and not exists(select 1 from public.clinic_bookings b left join public.clinic_services es on es.id=b.service_id where b.doctor_id=v_doctor_b and b.appointment_date=candidate_date and b.status in ('pending','confirmed') and candidate_time < b.appointment_time+make_interval(mins=>greatest(coalesce(es.duration_minutes,30),1)+buffer_minutes) and candidate_time+make_interval(mins=>v_duration_minutes+buffer_minutes)>b.appointment_time)
  order by candidate_date,candidate_time limit 1;
  if v_happy_date is null then raise exception 'E2E_NO_FREE_DOCTOR_B_SLOT'; end if;

  select candidate_date,candidate_time into v_invalid_date,v_invalid_time from (
    select v_cairo_date+d as candidate_date,(ds.start_time+s*interval '30 minutes')::time candidate_time,ds.start_time,ds.end_time,ds.break_start,ds.break_end,ds.enabled,coalesce(ds.buffer_minutes,0) buffer_minutes
    from generate_series(1,60) d join public.doctor_weekly_schedules ds on ds.doctor_id=v_doctor_a and ds.weekday=extract(dow from (v_cairo_date+d))::integer cross join generate_series(0,48) s where ds.mode in ('both','clinic','in_clinic')
  ) slots where enabled and candidate_time>=start_time and candidate_time+make_interval(mins=>v_duration_minutes)<=end_time
    and (break_start is null or break_end is null or candidate_time+make_interval(mins=>v_duration_minutes)<=break_start or candidate_time>=break_end)
    and not exists(select 1 from public.clinic_holidays h where h.closed and (h.applies_to in ('clinic','all') or (h.applies_to='doctor' and h.doctor_id=v_doctor_a)) and candidate_date between h.start_date and h.end_date)
    and not exists(select 1 from public.doctor_schedule_overrides o where o.doctor_id=v_doctor_a and o.override_date=candidate_date and o.type in ('closed','off','unavailable','holiday'))
    and not exists(select 1 from public.clinic_bookings b left join public.clinic_services es on es.id=b.service_id where b.doctor_id=v_doctor_a and b.appointment_date=candidate_date and b.status in ('pending','confirmed') and candidate_time < b.appointment_time+make_interval(mins=>greatest(coalesce(es.duration_minutes,30),1)+buffer_minutes) and candidate_time+make_interval(mins=>v_duration_minutes+buffer_minutes)>b.appointment_time)
  order by candidate_date,candidate_time limit 1;
  if v_invalid_date is null then raise exception 'E2E_NO_FREE_DOCTOR_A_SLOT'; end if;

  insert into public.clinic_patients (mrn,patient_name,patient_phone,patient_phone_normalized,patient_email,notes,active,marital_status,residence)
  values('E2E-'||v_suffix,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local','CONTROLLED_E2E_FIXTURE — synthetic patient; created by clinical authorization E2E suite factory',true,'single','CONTROLLED_E2E') returning id into v_patient_id;
  insert into public.clinic_bookings (booking_code,doctor_id,service_id,patient_name,patient_phone,patient_email,appointment_date,appointment_time,mode,notes,status,patient_language,patient_id,payment_status,service_authorization_status)
  values('E2E-HAPPY-'||v_suffix,v_doctor_b,v_service_id,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local',v_happy_date,v_happy_time,'clinic','CONTROLLED_E2E_FIXTURE — synthetic booking; authorized clinical path','confirmed','ar',v_patient_id,'unpaid','authorized') returning id into v_happy_id;
  insert into public.clinic_bookings (booking_code,doctor_id,service_id,patient_name,patient_phone,patient_email,appointment_date,appointment_time,mode,notes,status,patient_language,patient_id,payment_status,service_authorization_status)
  values('E2E-INVALID-'||v_suffix,v_doctor_a,v_service_id,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local',v_invalid_date,v_invalid_time,'clinic','CONTROLLED_E2E_FIXTURE — synthetic booking; invalid workflow state test','confirmed','ar',v_patient_id,'unpaid','authorized') returning id into v_invalid_id;
  return jsonb_build_object('happy_path_booking_id',v_happy_id,'wrong_doctor_booking_id',v_happy_id,'invalid_state_booking_id',v_invalid_id,'doctor_a_id',v_doctor_a,'doctor_b_id',v_doctor_b,'patient_id',v_patient_id);
end;
$$;
revoke all on function public.clinic_prepare_controlled_clinical_e2e_suite() from public,anon;
grant execute on function public.clinic_prepare_controlled_clinical_e2e_suite() to authenticated,service_role;
