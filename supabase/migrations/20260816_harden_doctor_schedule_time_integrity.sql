-- Azaad Clinic doctor scheduling integrity
-- Prevent invalid hours and breaks from entering the scheduling source of truth.

alter table public.doctor_weekly_schedules
  drop constraint if exists doctor_weekly_schedules_hours_check;
alter table public.doctor_weekly_schedules
  add constraint doctor_weekly_schedules_hours_check
  check ((not enabled) or (start_time < end_time));

alter table public.doctor_weekly_schedules
  drop constraint if exists doctor_weekly_schedules_break_check;
alter table public.doctor_weekly_schedules
  add constraint doctor_weekly_schedules_break_check
  check (
    break_start is null and break_end is null
    or (
      break_start < break_end
      and break_start >= start_time
      and break_end <= end_time
    )
  );

alter table public.doctor_schedule_overrides
  drop constraint if exists doctor_schedule_overrides_hours_check;
alter table public.doctor_schedule_overrides
  add constraint doctor_schedule_overrides_hours_check
  check (
    type = 'closed'
    or (
      start_time is not null
      and end_time is not null
      and start_time < end_time
    )
  );

alter table public.doctor_schedule_overrides
  drop constraint if exists doctor_schedule_overrides_break_check;
alter table public.doctor_schedule_overrides
  add constraint doctor_schedule_overrides_break_check
  check (
    break_start is null and break_end is null
    or (
      type = 'custom'
      and start_time is not null
      and end_time is not null
      and break_start < break_end
      and break_start >= start_time
      and break_end <= end_time
    )
  );
