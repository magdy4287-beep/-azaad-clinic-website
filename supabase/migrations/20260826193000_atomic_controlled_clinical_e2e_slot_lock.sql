-- Make controlled clinical E2E fixture slot selection share the canonical booking lock.
-- The production overlap trigger locks doctor/date immediately before its conflict scan.
-- The fixture factory must acquire that same lock before its final availability check.
create or replace function private.clinic_prepare_controlled_clinical_e2e_suite()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_staff_id uuid; v_role text; v_username text;
  v_doctor_a uuid; v_doctor_b uuid; v_service_id uuid; v_patient_id uuid;
  v_happy_id uuid; v_invalid_id uuid;
  v_happy_date date; v_happy_time time;
  v_invalid_date date; v_invalid_time time;
  v_duration_minutes integer;
  v_suffix text := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  v_lock_key bigint;
  v_found boolean;
  v_day_offset integer;
  v_slot_offset integer;
  v_candidate_date date;
  v_candidate_time time;
  v_start_minutes integer;
  v_end_minutes integer;
  v_break_start_minutes integer;
  v_break_end_minutes integer;
  v_candidate_minutes integer;
begin
  perform pg_advisory_xact_lock(hashtext('azaad:controlled_clinical_e2e_fixture_factory'));
  select id,upper(role),username into v_staff_id,v_role,v_username from public.clinic_staff where auth_user_id=auth.uid() and active=true limit 1;
  if v_staff_id is null or v_role not in ('OWNER','ADMIN','SECRETARY','RECEPTION','RECEPTIONIST','CASHIER') or coalesce(v_username,'')<>'frontdesk_azaad' then raise exception 'E2E_FIXTURE_NOT_AUTHORIZED' using errcode='42501'; end if;
  select doctor_id into v_doctor_a from public.clinic_staff where username='doctor_lamia' and role='DOCTOR' and active and doctor_id is not null limit 1;
  select doctor_id into v_doctor_b from public.clinic_staff where username='doctor_amgad' and role='DOCTOR' and active and doctor_id is not null limit 1;
  if v_doctor_a is null then raise exception 'E2E_DOCTOR_A_NOT_CONFIGURED'; end if;
  if v_doctor_b is null then raise exception 'E2E_DOCTOR_B_NOT_CONFIGURED'; end if;
  select id,greatest(coalesce(duration_minutes,60),1) into v_service_id,v_duration_minutes from public.clinic_services where name='جلسة علاج نفسي فردية' and active and price is not null and price>=0 limit 1;
  if v_service_id is null then raise exception 'E2E_SERVICE_NOT_CONFIGURED'; end if;

  v_found := false;
  for v_day_offset in 1..60 loop
    exit when v_found;
    for v_slot_offset in 0..24 loop
      v_candidate_date := current_date + v_day_offset;
      select (greatest(effective.start_time,wh.start_time)+(v_slot_offset*interval '30 minutes'))::time,
             public.clinic_time_minutes(greatest(effective.start_time,wh.start_time)),
             public.clinic_time_minutes(least(effective.end_time,wh.end_time)),
             public.clinic_time_minutes(effective.break_start),
             public.clinic_time_minutes(effective.break_end)
      into v_candidate_time,v_start_minutes,v_end_minutes,v_break_start_minutes,v_break_end_minutes
      from public.doctor_weekly_schedules dw
      join public.clinic_working_hours wh on wh.weekday=extract(dow from v_candidate_date)::integer and wh.enabled
      cross join lateral (select case when ov.type='custom' then ov.start_time else dw.start_time end start_time,case when ov.type='custom' then ov.end_time else dw.end_time end end_time,case when ov.type='custom' then ov.break_start else dw.break_start end break_start,case when ov.type='custom' then ov.break_end else dw.break_end end break_end,coalesce(ov.type,'weekly') override_type from (select 1) x left join public.doctor_schedule_overrides ov on ov.doctor_id=v_doctor_b and ov.override_date=v_candidate_date) effective
      where dw.doctor_id=v_doctor_b and dw.weekday=extract(dow from v_candidate_date)::smallint and dw.enabled and effective.override_type<>'closed' and greatest(effective.start_time,wh.start_time)<least(effective.end_time,wh.end_time);
      if not found then continue; end if;
      v_candidate_minutes := public.clinic_time_minutes(v_candidate_time);
      if v_candidate_minutes < v_start_minutes or v_candidate_minutes + v_duration_minutes > v_end_minutes then continue; end if;
      if v_break_start_minutes is not null and v_break_end_minutes is not null and not (v_candidate_minutes + v_duration_minutes <= v_break_start_minutes or v_candidate_minutes >= v_break_end_minutes) then continue; end if;
      if exists(select 1 from public.clinic_holidays h where h.closed and h.applies_to='clinic' and v_candidate_date between h.start_date and h.end_date) then continue; end if;
      if not exists(select 1 from public.clinic_doctors d where d.id=v_doctor_b and d.active and (coalesce(cardinality(d.services),0)=0 or v_service_id::text=any(d.services))) then continue; end if;
      v_lock_key := hashtextextended(coalesce(v_doctor_b::text,'')||'|'||v_candidate_date::text,0);
      perform pg_advisory_xact_lock(v_lock_key);
      if exists(select 1 from public.clinic_bookings b join public.clinic_services bs on bs.id=b.service_id where b.doctor_id=v_doctor_b and b.appointment_date=v_candidate_date and public.clinic_is_active_booking_status(b.status) and v_candidate_minutes < public.clinic_time_minutes(b.appointment_time)+greatest(coalesce(bs.duration_minutes,60),1) and public.clinic_time_minutes(b.appointment_time) < v_candidate_minutes+v_duration_minutes) then continue; end if;
      v_happy_date := v_candidate_date; v_happy_time := v_candidate_time; v_found := true;
    end loop;
  end loop;
  if not v_found then raise exception 'E2E_NO_FREE_DOCTOR_B_SLOT'; end if;

  v_found := false;
  for v_day_offset in 1..60 loop
    exit when v_found;
    for v_slot_offset in 0..24 loop
      v_candidate_date := current_date + v_day_offset;
      select (greatest(effective.start_time,wh.start_time)+(v_slot_offset*interval '30 minutes'))::time,
             public.clinic_time_minutes(greatest(effective.start_time,wh.start_time)),
             public.clinic_time_minutes(least(effective.end_time,wh.end_time)),
             public.clinic_time_minutes(effective.break_start),
             public.clinic_time_minutes(effective.break_end)
      into v_candidate_time,v_start_minutes,v_end_minutes,v_break_start_minutes,v_break_end_minutes
      from public.doctor_weekly_schedules dw
      join public.clinic_working_hours wh on wh.weekday=extract(dow from v_candidate_date)::integer and wh.enabled
      cross join lateral (select case when ov.type='custom' then ov.start_time else dw.start_time end start_time,case when ov.type='custom' then ov.end_time else dw.end_time end end_time,case when ov.type='custom' then ov.break_start else dw.break_start end break_start,case when ov.type='custom' then ov.break_end else dw.break_end end break_end,coalesce(ov.type,'weekly') override_type from (select 1) x left join public.doctor_schedule_overrides ov on ov.doctor_id=v_doctor_a and ov.override_date=v_candidate_date) effective
      where dw.doctor_id=v_doctor_a and dw.weekday=extract(dow from v_candidate_date)::smallint and dw.enabled and effective.override_type<>'closed' and greatest(effective.start_time,wh.start_time)<least(effective.end_time,wh.end_time);
      if not found then continue; end if;
      v_candidate_minutes := public.clinic_time_minutes(v_candidate_time);
      if v_candidate_minutes < v_start_minutes or v_candidate_minutes + v_duration_minutes > v_end_minutes then continue; end if;
      if v_break_start_minutes is not null and v_break_end_minutes is not null and not (v_candidate_minutes + v_duration_minutes <= v_break_start_minutes or v_candidate_minutes >= v_break_end_minutes) then continue; end if;
      if exists(select 1 from public.clinic_holidays h where h.closed and h.applies_to='clinic' and v_candidate_date between h.start_date and h.end_date) then continue; end if;
      if not exists(select 1 from public.clinic_doctors d where d.id=v_doctor_a and d.active and (coalesce(cardinality(d.services),0)=0 or v_service_id::text=any(d.services))) then continue; end if;
      v_lock_key := hashtextextended(coalesce(v_doctor_a::text,'')||'|'||v_candidate_date::text,0);
      perform pg_advisory_xact_lock(v_lock_key);
      if exists(select 1 from public.clinic_bookings b join public.clinic_services bs on bs.id=b.service_id where b.doctor_id=v_doctor_a and b.appointment_date=v_candidate_date and public.clinic_is_active_booking_status(b.status) and v_candidate_minutes < public.clinic_time_minutes(b.appointment_time)+greatest(coalesce(bs.duration_minutes,60),1) and public.clinic_time_minutes(b.appointment_time) < v_candidate_minutes+v_duration_minutes) then continue; end if;
      v_invalid_date := v_candidate_date; v_invalid_time := v_candidate_time; v_found := true;
    end loop;
  end loop;
  if not v_found then raise exception 'E2E_NO_FREE_DOCTOR_A_SLOT'; end if;

  insert into public.clinic_patients(mrn,patient_name,patient_phone,patient_phone_normalized,patient_email,notes,active,marital_status,residence) values('E2E-'||v_suffix,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local','CONTROLLED_E2E_FIXTURE — synthetic patient; created by clinical authorization E2E suite factory',true,'single','CONTROLLED_E2E') returning id into v_patient_id;
  insert into public.clinic_bookings(booking_code,doctor_id,service_id,patient_name,patient_phone,patient_email,appointment_date,appointment_time,mode,notes,status,patient_language,patient_id,payment_status,service_authorization_status) values('E2E-HAPPY-'||v_suffix,v_doctor_b,v_service_id,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local',v_happy_date,v_happy_time,'clinic','CONTROLLED_E2E_FIXTURE — synthetic booking; authorized clinical path','confirmed','ar',v_patient_id,'unpaid','authorized') returning id into v_happy_id;
  insert into public.clinic_bookings(booking_code,doctor_id,service_id,patient_name,patient_phone,patient_email,appointment_date,appointment_time,mode,notes,status,patient_language,patient_id,payment_status,service_authorization_status) values('E2E-INVALID-'||v_suffix,v_doctor_a,v_service_id,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local',v_invalid_date,v_invalid_time,'clinic','CONTROLLED_E2E_FIXTURE — synthetic booking; invalid workflow state test','confirmed','ar',v_patient_id,'unpaid','authorized') returning id into v_invalid_id;
  return jsonb_build_object('happy_path_booking_id',v_happy_id,'wrong_doctor_booking_id',v_happy_id,'invalid_state_booking_id',v_invalid_id,'doctor_a_id',v_doctor_a,'doctor_b_id',v_doctor_b,'patient_id',v_patient_id);
end;
$$;
revoke all on function public.clinic_prepare_controlled_clinical_e2e_suite() from public, anon;
grant execute on function public.clinic_prepare_controlled_clinical_e2e_suite() to authenticated, service_role;
