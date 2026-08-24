-- Canonical read-only slot projection used by the public scheduling Edge Function.
-- It is intentionally not exposed to anon/authenticated clients; the Edge Function
-- invokes it with the service role so public reads retain the existing security boundary.
create or replace function public.clinic_public_available_slots(
  p_doctor_id uuid,
  p_service_id uuid,
  p_appointment_date date,
  p_mode text default 'clinic'
) returns table(slot_time text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_mode text;
  v_doctor public.clinic_doctors;
  v_service public.clinic_services;
  v_schedule record;
  v_override record;
  v_holiday record;
  v_start integer;
  v_end integer;
  v_break_start integer;
  v_break_end integer;
  v_duration integer;
  v_buffer integer;
  v_step integer;
  v_max_daily integer;
  v_daily_count integer;
  v_now_date date;
  v_now_minutes integer;
  v_minute integer;
  v_conflict boolean;
begin
  v_mode := case when lower(coalesce(p_mode,'clinic')) in ('online','online_session','online-session') then 'online' else 'clinic' end;
  if p_doctor_id is null or p_service_id is null or p_appointment_date is null then return; end if;

  select * into v_doctor from public.clinic_doctors where id=p_doctor_id and active=true;
  if not found then return; end if;
  select * into v_service from public.clinic_services where id=p_service_id and active=true;
  if not found then return; end if;
  if array_length(v_doctor.services,1) is not null and not (p_service_id::text = any(v_doctor.services::text[])) then return; end if;

  select * into v_override from public.doctor_schedule_overrides
  where doctor_id=p_doctor_id and override_date=p_appointment_date
  order by updated_at desc nulls last limit 1;
  if found and lower(coalesce(v_override.type,'')) in ('closed','off','unavailable','holiday') then return; end if;

  select * into v_holiday from public.clinic_holidays
  where p_appointment_date between start_date and end_date
    and closed=true
    and (applies_to='all' or applies_to='clinic' or (applies_to='doctor' and doctor_id=p_doctor_id))
  limit 1;
  if found then return; end if;

  select * into v_schedule from public.doctor_weekly_schedules
  where doctor_id=p_doctor_id
    and weekday=extract(dow from p_appointment_date)::integer
    and enabled=true
    and (mode=v_mode or mode='both' or (v_mode='clinic' and mode='in_clinic'))
  order by case when mode=v_mode then 0 when mode='both' then 1 else 2 end
  limit 1;
  if not found then return; end if;

  if v_override.id is not null then
    if v_override.start_time is not null then v_schedule.start_time:=v_override.start_time; end if;
    if v_override.end_time is not null then v_schedule.end_time:=v_override.end_time; end if;
    if v_override.break_start is not null then v_schedule.break_start:=v_override.break_start; end if;
    if v_override.break_end is not null then v_schedule.break_end:=v_override.break_end; end if;
    if v_override.slot_minutes is not null then v_schedule.slot_minutes:=v_override.slot_minutes; end if;
    if v_override.buffer_minutes is not null then v_schedule.buffer_minutes:=v_override.buffer_minutes; end if;
    if v_override.max_daily_bookings is not null then v_schedule.max_daily_bookings:=v_override.max_daily_bookings; end if;
  end if;

  v_duration:=greatest(coalesce(v_service.duration_minutes,30),1);
  v_buffer:=greatest(coalesce(v_schedule.buffer_minutes,0),0);
  v_step:=greatest(coalesce(v_schedule.slot_minutes,v_duration),5);
  v_start:=extract(hour from v_schedule.start_time)::integer*60+extract(minute from v_schedule.start_time)::integer;
  v_end:=extract(hour from v_schedule.end_time)::integer*60+extract(minute from v_schedule.end_time)::integer;
  v_break_start:=case when v_schedule.break_start is null then null else extract(hour from v_schedule.break_start)::integer*60+extract(minute from v_schedule.break_start)::integer end;
  v_break_end:=case when v_schedule.break_end is null then null else extract(hour from v_schedule.break_end)::integer*60+extract(minute from v_schedule.break_end)::integer end;
  v_max_daily:=case when v_schedule.max_daily_bookings is null then null else greatest(v_schedule.max_daily_bookings,0) end;
  v_now_date:=(now() at time zone 'Africa/Cairo')::date;
  v_now_minutes:=extract(hour from(now() at time zone 'Africa/Cairo'))::integer*60+extract(minute from(now() at time zone 'Africa/Cairo'))::integer;

  if p_appointment_date < v_now_date then return; end if;
  if v_max_daily is not null then
    select count(*) into v_daily_count from public.clinic_bookings
    where doctor_id=p_doctor_id and appointment_date=p_appointment_date and status in ('pending','confirmed');
    if v_daily_count>=v_max_daily then return; end if;
  end if;
  if not (v_start >= 0 and v_end > v_start and v_end <= 1440 and v_duration > 0) then return; end if;

  for v_minute in v_start..(v_end-v_duration) by v_step loop
    if p_appointment_date=v_now_date and v_minute<=v_now_minutes then continue; end if;
    if v_break_start is not null and v_break_end is not null and v_minute<v_break_end and v_minute+v_duration>v_break_start then continue; end if;

    select exists(
      select 1
      from public.clinic_bookings b
      left join public.clinic_services s on s.id=b.service_id
      where b.doctor_id=p_doctor_id
        and b.appointment_date=p_appointment_date
        and b.status in ('pending','confirmed')
        and v_minute < (extract(hour from b.appointment_time)::integer*60+extract(minute from b.appointment_time)::integer)+greatest(coalesce(s.duration_minutes,30),1)+v_buffer
        and v_minute+v_duration+v_buffer > (extract(hour from b.appointment_time)::integer*60+extract(minute from b.appointment_time)::integer)
    ) into v_conflict;

    if not v_conflict then
      slot_time:=lpad((v_minute/60)::text,2,'0')||':'||lpad((v_minute%60)::text,2,'0');
      return next;
    end if;
  end loop;
  return;
end;
$$;

revoke all on function public.clinic_public_available_slots(uuid,uuid,date,text) from public, anon, authenticated;
grant execute on function public.clinic_public_available_slots(uuid,uuid,date,text) to service_role;
