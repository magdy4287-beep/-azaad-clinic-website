begin;

create unique index if not exists clinic_bookings_active_doctor_slot_uq
  on public.clinic_bookings (doctor_id, appointment_date, appointment_time)
  where status in ('pending','confirmed');

alter table public.clinic_bookings replica identity full;
alter table public.doctor_weekly_schedules replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.clinic_bookings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.doctor_weekly_schedules;
exception when duplicate_object then null;
end $$;

commit;
