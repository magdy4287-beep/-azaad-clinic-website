-- AZAAD canonical ICU domain
-- ICU extends the canonical admission/ward and nursing domains.
-- No autonomous clinical decisions.

create table if not exists public.clinic_icu_units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  acuity_profile text not null default 'GENERAL',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_icu_beds (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.clinic_icu_units(id),
  bed_code text not null,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','RESERVED','OCCUPIED','CLEANING','OUT_OF_SERVICE')),
  capabilities jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(unit_id, bed_code)
);

create table if not exists public.clinic_icu_stays (
  id uuid primary key default gen_random_uuid(),
  admission_id uuid,
  patient_id uuid not null,
  encounter_id uuid,
  icu_bed_id uuid not null references public.clinic_icu_beds(id),
  status text not null default 'ACTIVE' check (status in ('REQUESTED','ACTIVE','TRANSFERRED','DISCHARGED','CANCELLED')),
  admitted_at timestamptz not null default now(),
  discharged_at timestamptz,
  admitting_staff_id uuid,
  discharge_staff_id uuid,
  disposition text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_icu_observations (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.clinic_icu_stays(id),
  patient_id uuid not null,
  recorded_by uuid not null,
  observed_at timestamptz not null default now(),
  heart_rate integer,
  respiratory_rate integer,
  systolic_bp integer,
  diastolic_bp integer,
  spo2 numeric(5,2),
  temperature_c numeric(5,2),
  consciousness text,
  oxygen_support text,
  urine_output_ml numeric(10,2),
  notes text,
  source text not null default 'ICU'
);

create table if not exists public.clinic_icu_flowsheet_entries (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.clinic_icu_stays(id),
  recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  category text not null,
  metric text not null,
  value_numeric numeric,
  value_text text,
  unit text,
  source text not null default 'MANUAL'
);

create table if not exists public.clinic_icu_escalations (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.clinic_icu_stays(id),
  patient_id uuid not null,
  raised_by uuid not null,
  escalation_type text not null,
  reason text not null,
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESOLVED','CANCELLED')),
  acknowledged_by uuid,
  resolved_by uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.clinic_icu_events (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid,
  patient_id uuid,
  actor_staff_id uuid,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clinic_icu_beds_unit_status_idx on public.clinic_icu_beds(unit_id,status);
create index if not exists clinic_icu_stays_patient_idx on public.clinic_icu_stays(patient_id,status,admitted_at desc);
create index if not exists clinic_icu_observations_stay_idx on public.clinic_icu_observations(stay_id,observed_at desc);
create index if not exists clinic_icu_flowsheet_stay_idx on public.clinic_icu_flowsheet_entries(stay_id,recorded_at desc);
create index if not exists clinic_icu_escalations_open_idx on public.clinic_icu_escalations(stay_id,status,created_at desc);
create index if not exists clinic_icu_events_patient_idx on public.clinic_icu_events(patient_id,created_at desc);
