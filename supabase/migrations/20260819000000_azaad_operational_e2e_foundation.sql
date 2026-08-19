-- AZAAD cross-department operational foundation
-- Scheduling, attendance, doctor transfer, compensation, service catalog normalization,
-- and unified daily reporting. All privileged writes remain permissioned and auditable.

create table if not exists public.clinic_doctor_transfers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.clinic_patients(id),
  booking_id uuid references public.clinic_bookings(id),
  from_doctor_id uuid not null references public.clinic_doctors(id),
  to_doctor_id uuid not null references public.clinic_doctors(id),
  requested_by text not null check (requested_by in ('patient','doctor')),
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','completed','cancelled')),
  approved_by_staff_id uuid references public.clinic_staff(id),
  approved_at timestamptz,
  completed_at timestamptz,
  created_by uuid default public.clinic_current_staff_id() references public.clinic_staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_transfer_different_doctors check (from_doctor_id <> to_doctor_id)
);
create index if not exists clinic_doctor_transfers_patient_idx on public.clinic_doctor_transfers(patient_id,created_at desc);
create index if not exists clinic_doctor_transfers_booking_idx on public.clinic_doctor_transfers(booking_id,status);

create table if not exists public.clinic_staff_attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.clinic_staff(id),
  work_date date not null default current_date,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  break_start_at timestamptz,
  break_end_at timestamptz,
  status text not null default 'present' check (status in ('present','late','absent','leave','holiday','off')),
  minutes_late integer not null default 0 check (minutes_late >= 0),
  notes text,
  recorded_by uuid references public.clinic_staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(staff_id,work_date)
);
create index if not exists clinic_staff_attendance_date_idx on public.clinic_staff_attendance(work_date,status);

create table if not exists public.clinic_doctor_compensation_rules (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.clinic_doctors(id),
  compensation_model text not null check (compensation_model in ('percentage','salary','salary_plus_percentage','fixed_per_visit')),
  base_salary numeric(12,2) not null default 0 check (base_salary >= 0),
  salary_period text not null default 'monthly' check (salary_period in ('monthly','weekly','per_visit')),
  commission_percent numeric(5,2) not null default 0 check (commission_percent between 0 and 100),
  fixed_per_visit numeric(12,2) not null default 0 check (fixed_per_visit >= 0),
  effective_from date not null default current_date,
  effective_to date,
  active boolean not null default true,
  notes text,
  created_by uuid default public.clinic_current_staff_id() references public.clinic_staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compensation_dates_valid check (effective_to is null or effective_to >= effective_from)
);
create unique index if not exists clinic_doctor_comp_active_idx on public.clinic_doctor_compensation_rules(doctor_id) where active;

create table if not exists public.clinic_service_catalog_map (
  service_id uuid primary key references public.clinic_services(id),
  canonical_key text not null unique,
  active boolean not null default true,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_consultation_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references public.clinic_doctors(id),
  service_id uuid references public.clinic_services(id),
  price numeric(12,2) not null check (price >= 0),
  effective_from date not null default current_date,
  effective_to date,
  active boolean not null default true,
  created_by uuid default public.clinic_current_staff_id() references public.clinic_staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_dates_valid check (effective_to is null or effective_to >= effective_from)
);
create index if not exists clinic_consultation_pricing_lookup_idx on public.clinic_consultation_pricing_rules(doctor_id,service_id,active,effective_from desc);

create table if not exists public.clinic_daily_operational_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  generated_by uuid references public.clinic_staff(id),
  total_appointments integer not null default 0,
  completed_appointments integer not null default 0,
  cancelled_appointments integer not null default 0,
  no_show_appointments integer not null default 0,
  checked_in_count integer not null default 0,
  waiting_list_count integer not null default 0,
  invoices_count integer not null default 0,
  invoiced_total numeric(12,2) not null default 0,
  collected_total numeric(12,2) not null default 0,
  outstanding_total numeric(12,2) not null default 0,
  refund_requested_total numeric(12,2) not null default 0,
  expenses_total numeric(12,2) not null default 0,
  doctor_share_total numeric(12,2) not null default 0,
  clinic_share_total numeric(12,2) not null default 0,
  attendance_present integer not null default 0,
  attendance_late integer not null default 0,
  attendance_absent integer not null default 0,
  generated_at timestamptz not null default now(),
  unique(report_date)
);

create or replace function public.clinic_current_doctor_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select s.doctor_id from public.clinic_staff s
  where s.auth_user_id = (select auth.uid()) and s.active = true and s.doctor_id is not null limit 1;
$$;

create or replace function public.clinic_request_doctor_transfer(
  p_patient_id uuid,
  p_booking_id uuid,
  p_to_doctor_id uuid,
  p_requested_by text,
  p_reason text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_from uuid; v_id uuid;
begin
  if not (clinic_has_permission('doctor') or clinic_has_permission('booking_complete') or clinic_has_permission('security')) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select doctor_id into v_from from clinic_bookings where id=p_booking_id and patient_id=p_patient_id limit 1;
  if v_from is null then raise exception 'BOOKING_DOCTOR_NOT_FOUND'; end if;
  if v_from = p_to_doctor_id then raise exception 'TRANSFER_SAME_DOCTOR'; end if;
  insert into clinic_doctor_transfers(patient_id,booking_id,from_doctor_id,to_doctor_id,requested_by,reason)
  values(p_patient_id,p_booking_id,v_from,p_to_doctor_id,p_requested_by,p_reason) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.clinic_approve_doctor_transfer(p_transfer_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not clinic_has_permission('doctor') then raise exception 'DOCTOR_APPROVAL_REQUIRED'; end if;
  update clinic_doctor_transfers set status='approved',approved_by_staff_id=clinic_current_staff_id(),approved_at=now(),updated_at=now() where id=p_transfer_id and status='pending';
  if not found then raise exception 'TRANSFER_NOT_PENDING'; end if;
  return true;
end; $$;

create or replace function public.clinic_complete_doctor_transfer(p_transfer_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_booking uuid; v_to uuid;
begin
  if not clinic_has_permission('booking_complete') and not clinic_has_permission('security') then raise exception 'NOT_AUTHORIZED'; end if;
  select booking_id,to_doctor_id into v_booking,v_to from clinic_doctor_transfers where id=p_transfer_id and status='approved';
  if v_booking is null then raise exception 'TRANSFER_NOT_APPROVED'; end if;
  update clinic_bookings set doctor_id=v_to,updated_at=now() where id=v_booking;
  update clinic_doctor_transfers set status='completed',completed_at=now(),updated_at=now() where id=p_transfer_id;
  return true;
end; $$;

create or replace function public.clinic_build_daily_operational_report(p_date date default current_date)
returns public.clinic_daily_operational_reports language plpgsql security definer set search_path = public as $$
declare r public.clinic_daily_operational_reports;
begin
  if not clinic_has_permission('security') then raise exception 'REPORT_ACCESS_DENIED'; end if;
  insert into clinic_daily_operational_reports(report_date,generated_by,total_appointments,completed_appointments,cancelled_appointments,no_show_appointments,checked_in_count,waiting_list_count)
  select p_date,clinic_current_staff_id(),count(*),count(*) filter(where status='completed'),count(*) filter(where status='cancelled'),count(*) filter(where status='no_show'),count(*) filter(where checked_in_at is not null),(select count(*) from clinic_waiting_list w where w.requested_date=p_date and w.status in('pending','contacted')) from clinic_bookings b where b.appointment_date=p_date
  on conflict(report_date) do update set generated_by=excluded.generated_by,total_appointments=excluded.total_appointments,completed_appointments=excluded.completed_appointments,cancelled_appointments=excluded.cancelled_appointments,no_show_appointments=excluded.no_show_appointments,checked_in_count=excluded.checked_in_count,waiting_list_count=excluded.waiting_list_count,generated_at=now()
  returning * into r;
  return r;
end; $$;

alter table public.clinic_doctor_transfers enable row level security;
alter table public.clinic_staff_attendance enable row level security;
alter table public.clinic_doctor_compensation_rules enable row level security;
alter table public.clinic_service_catalog_map enable row level security;
alter table public.clinic_consultation_pricing_rules enable row level security;
alter table public.clinic_daily_operational_reports enable row level security;

create policy doctor_transfers_select on public.clinic_doctor_transfers for select to authenticated using (clinic_has_permission('security') or clinic_has_permission('booking_complete') or from_doctor_id=clinic_current_doctor_id() or to_doctor_id=clinic_current_doctor_id());
create policy doctor_transfers_insert on public.clinic_doctor_transfers for insert to authenticated with check (clinic_has_permission('security') or clinic_has_permission('booking_complete') or from_doctor_id=clinic_current_doctor_id());
create policy attendance_security on public.clinic_staff_attendance for all to authenticated using (clinic_has_permission('security')) with check (clinic_has_permission('security'));
create policy compensation_security on public.clinic_doctor_compensation_rules for all to authenticated using (clinic_has_permission('security')) with check (clinic_has_permission('security'));
create policy service_catalog_security on public.clinic_service_catalog_map for all to authenticated using (clinic_has_permission('security')) with check (clinic_has_permission('security'));
create policy pricing_security on public.clinic_consultation_pricing_rules for all to authenticated using (clinic_has_permission('security')) with check (clinic_has_permission('security'));
create policy daily_report_security on public.clinic_daily_operational_reports for all to authenticated using (clinic_has_permission('security')) with check (clinic_has_permission('security'));
