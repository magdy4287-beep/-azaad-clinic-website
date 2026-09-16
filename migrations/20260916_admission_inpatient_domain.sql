-- AZAAD canonical Admission / Inpatient / Ward domain
-- Runtime: Appwrite HttpOnly -> Vercel API -> Neon
-- Bed placement and discharge are operational records; clinical decisions remain clinician-owned.

create table if not exists public.clinic_wards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  department text,
  gender_policy text not null default 'MIXED' check (gender_policy in ('MIXED','MALE','FEMALE','PEDIATRIC')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_beds (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.clinic_wards(id),
  code text not null,
  room_code text,
  bed_type text not null default 'STANDARD',
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','RESERVED','OCCUPIED','CLEANING','BLOCKED','MAINTENANCE')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ward_id, code)
);

create table if not exists public.clinic_admissions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  encounter_id uuid,
  admission_type text not null default 'INPATIENT' check (admission_type in ('INPATIENT','OBSERVATION','DAY_CASE','TRANSFER')),
  status text not null default 'REQUESTED' check (status in ('REQUESTED','APPROVED','ADMITTED','TRANSFERRED','DISCHARGED','CANCELLED')),
  source text not null default 'CLINICAL' check (source in ('ED','CLINIC','TRANSFER','DIRECT','OTHER')),
  requesting_staff_id uuid,
  admitting_staff_id uuid,
  admitted_at timestamptz,
  expected_discharge_at timestamptz,
  discharged_at timestamptz,
  discharge_disposition text,
  discharge_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_bed_assignments (
  id uuid primary key default gen_random_uuid(),
  admission_id uuid not null references public.clinic_admissions(id),
  bed_id uuid not null references public.clinic_beds(id),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ENDED','CANCELLED')),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  assigned_by uuid,
  reason text
);

create table if not exists public.clinic_inpatient_transfers (
  id uuid primary key default gen_random_uuid(),
  admission_id uuid not null references public.clinic_admissions(id),
  from_bed_id uuid references public.clinic_beds(id),
  to_bed_id uuid references public.clinic_beds(id),
  transfer_type text not null default 'WARD' check (transfer_type in ('WARD','BED','ICU','OR','ED','OTHER')),
  requested_by uuid,
  approved_by uuid,
  status text not null default 'REQUESTED' check (status in ('REQUESTED','APPROVED','COMPLETED','CANCELLED')),
  reason text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.clinic_inpatient_events (
  id uuid primary key default gen_random_uuid(),
  admission_id uuid references public.clinic_admissions(id),
  patient_id uuid,
  actor_staff_id uuid,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clinic_beds_ward_status_idx on public.clinic_beds(ward_id,status);
create index if not exists clinic_admissions_patient_status_idx on public.clinic_admissions(patient_id,status,created_at desc);
create index if not exists clinic_admissions_status_idx on public.clinic_admissions(status,created_at desc);
create index if not exists clinic_bed_assignments_admission_idx on public.clinic_bed_assignments(admission_id,status);
create index if not exists clinic_bed_assignments_bed_idx on public.clinic_bed_assignments(bed_id,status);
create index if not exists clinic_inpatient_events_admission_idx on public.clinic_inpatient_events(admission_id,created_at desc);
