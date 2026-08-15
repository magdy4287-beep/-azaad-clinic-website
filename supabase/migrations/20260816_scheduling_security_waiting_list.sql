-- Azaad Clinic scheduling security + central waiting list
-- Applied to the active Supabase project as migration: scheduling_security_waiting_list

create or replace function public.clinic_current_doctor_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select s.doctor_id from public.clinic_staff s
  where s.auth_user_id = (select auth.uid()) and s.active = true and s.doctor_id is not null limit 1;
$$;

create table if not exists public.clinic_waiting_list (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.clinic_patients(id),
  doctor_id uuid references public.clinic_doctors(id),
  preferred_doctor_id uuid references public.clinic_doctors(id),
  alternative_doctor_ids uuid[] not null default '{}',
  service_id uuid references public.clinic_services(id),
  requested_date date not null,
  preferred_start_time time,
  preferred_end_time time,
  priority text not null default 'normal' check (priority in ('normal','urgent','emergency')),
  reason text,
  patient_phone_snapshot text not null,
  status text not null default 'pending' check (status in ('pending','contacted','confirmed','converted','cancelled','expired','no_show')),
  position integer not null default 1 check (position > 0),
  source text not null default 'manual' check (source in ('manual','phone','doctor','frontdesk')),
  notes text,
  created_by uuid default public.clinic_current_staff_id() references public.clinic_staff(id),
  contacted_at timestamptz,
  confirmed_at timestamptz,
  expires_at timestamptz,
  converted_booking_id uuid references public.clinic_bookings(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waiting_list_time_range_valid check (preferred_start_time is null or preferred_end_time is null or preferred_start_time < preferred_end_time)
);

create index if not exists clinic_waiting_list_patient_idx on public.clinic_waiting_list(patient_id);
create index if not exists clinic_waiting_list_doctor_date_idx on public.clinic_waiting_list(doctor_id, requested_date, status, priority, position);
create index if not exists clinic_waiting_list_preferred_doctor_date_idx on public.clinic_waiting_list(preferred_doctor_id, requested_date, status);
create index if not exists clinic_waiting_list_active_idx on public.clinic_waiting_list(requested_date, status) where status in ('pending','contacted');
create unique index if not exists clinic_waiting_list_active_patient_slot_idx on public.clinic_waiting_list(patient_id, coalesce(doctor_id, preferred_doctor_id), requested_date, coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid)) where status in ('pending','contacted');

create or replace function public.clinic_waiting_list_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists clinic_waiting_list_updated_at on public.clinic_waiting_list;
create trigger clinic_waiting_list_updated_at before update on public.clinic_waiting_list for each row execute function public.clinic_waiting_list_touch_updated_at();

create or replace function public.clinic_waiting_list_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.clinic_audit_log(actor_staff_id, action, entity_type, entity_id, before_data, after_data) values (public.clinic_current_staff_id(), 'WAITING_LIST_CREATED', 'waiting_list', new.id::text, null, to_jsonb(new)); return new;
  elsif tg_op = 'UPDATE' then
    insert into public.clinic_audit_log(actor_staff_id, action, entity_type, entity_id, before_data, after_data) values (public.clinic_current_staff_id(), 'WAITING_LIST_UPDATED', 'waiting_list', new.id::text, to_jsonb(old), to_jsonb(new)); return new;
  elsif tg_op = 'DELETE' then
    insert into public.clinic_audit_log(actor_staff_id, action, entity_type, entity_id, before_data, after_data) values (public.clinic_current_staff_id(), 'WAITING_LIST_DELETED', 'waiting_list', old.id::text, to_jsonb(old), null); return old;
  end if;
  return null;
end;
$$;
drop trigger if exists clinic_waiting_list_audit on public.clinic_waiting_list;
create trigger clinic_waiting_list_audit after insert or update or delete on public.clinic_waiting_list for each row execute function public.clinic_waiting_list_audit();

alter table public.clinic_waiting_list enable row level security;

drop policy if exists doctor_weekly_schedules_select on public.doctor_weekly_schedules;
create policy doctor_weekly_schedules_select on public.doctor_weekly_schedules for select to authenticated using ((select public.clinic_has_permission('doctor')) and ((select public.clinic_has_permission('security')) or doctor_id = (select public.clinic_current_doctor_id())));
drop policy if exists doctor_weekly_schedules_manage on public.doctor_weekly_schedules;
create policy doctor_weekly_schedules_manage on public.doctor_weekly_schedules for all to authenticated using ((select public.clinic_has_permission('security'))) with check ((select public.clinic_has_permission('security')));

drop policy if exists doctor_schedule_overrides_select on public.doctor_schedule_overrides;
create policy doctor_schedule_overrides_select on public.doctor_schedule_overrides for select to authenticated using ((select public.clinic_has_permission('doctor')) and ((select public.clinic_has_permission('security')) or doctor_id = (select public.clinic_current_doctor_id())));
drop policy if exists doctor_schedule_overrides_manage on public.doctor_schedule_overrides;
create policy doctor_schedule_overrides_manage on public.doctor_schedule_overrides for all to authenticated using ((select public.clinic_has_permission('security'))) with check ((select public.clinic_has_permission('security')));

drop policy if exists clinic_waiting_list_select on public.clinic_waiting_list;
create policy clinic_waiting_list_select on public.clinic_waiting_list for select to authenticated using ((select public.clinic_has_permission('patient')) and ((select public.clinic_has_permission('security')) or (select public.clinic_has_permission('booking_complete')) or ((select public.clinic_has_permission('doctor')) and coalesce(doctor_id, preferred_doctor_id) = (select public.clinic_current_doctor_id()))));
drop policy if exists clinic_waiting_list_insert on public.clinic_waiting_list;
create policy clinic_waiting_list_insert on public.clinic_waiting_list for insert to authenticated with check ((select public.clinic_has_permission('booking_complete')) or ((select public.clinic_has_permission('doctor')) and coalesce(doctor_id, preferred_doctor_id) = (select public.clinic_current_doctor_id())));
drop policy if exists clinic_waiting_list_update on public.clinic_waiting_list;
create policy clinic_waiting_list_update on public.clinic_waiting_list for update to authenticated using ((select public.clinic_has_permission('security')) or (select public.clinic_has_permission('booking_complete')) or ((select public.clinic_has_permission('doctor')) and coalesce(doctor_id, preferred_doctor_id) = (select public.clinic_current_doctor_id()))) with check ((select public.clinic_has_permission('security')) or (select public.clinic_has_permission('booking_complete')) or ((select public.clinic_has_permission('doctor')) and coalesce(doctor_id, preferred_doctor_id) = (select public.clinic_current_doctor_id())));
drop policy if exists clinic_waiting_list_delete on public.clinic_waiting_list;
create policy clinic_waiting_list_delete on public.clinic_waiting_list for delete to authenticated using ((select public.clinic_has_permission('security')));
