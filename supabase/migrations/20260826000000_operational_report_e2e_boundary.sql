-- Keep operational daily reporting aligned with the canonical E2E data boundary.
-- E2E fixtures remain in the database for test execution; operational reports must exclude them.

create or replace function public.clinic_build_daily_operational_report(p_date date default current_date)
returns public.clinic_daily_operational_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.clinic_daily_operational_reports;
begin
  if not clinic_has_permission('security') then
    raise exception 'REPORT_ACCESS_DENIED';
  end if;

  insert into clinic_daily_operational_reports(
    report_date,
    generated_by,
    total_appointments,
    completed_appointments,
    cancelled_appointments,
    no_show_appointments,
    checked_in_count,
    waiting_list_count
  )
  select
    p_date,
    clinic_current_staff_id(),
    count(*),
    count(*) filter (where b.status = 'completed'),
    count(*) filter (where b.status = 'cancelled'),
    count(*) filter (where b.status = 'no_show'),
    count(*) filter (where b.checked_in_at is not null),
    (
      select count(*)
      from clinic_waiting_list w
      where w.requested_date = p_date
        and w.status in ('pending', 'contacted')
    )
  from clinic_bookings b
  where b.appointment_date = p_date
    and coalesce(b.booking_code, '') not ilike 'E2E-%'
  on conflict (report_date) do update set
    generated_by = excluded.generated_by,
    total_appointments = excluded.total_appointments,
    completed_appointments = excluded.completed_appointments,
    cancelled_appointments = excluded.cancelled_appointments,
    no_show_appointments = excluded.no_show_appointments,
    checked_in_count = excluded.checked_in_count,
    waiting_list_count = excluded.waiting_list_count,
    generated_at = now()
  returning * into r;

  return r;
end;
$$;
