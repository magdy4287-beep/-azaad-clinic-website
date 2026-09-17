-- AZAAD canonical Nursing domain
-- Runtime: Appwrite HttpOnly -> Vercel API -> Neon
-- No clinical decision automation; all clinical actions remain staff-owned.

create table if not exists public.clinic_nursing_assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  encounter_id uuid,
  nurse_staff_id uuid not null,
  assignment_type text not null default 'PRIMARY' check (assignment_type in ('PRIMARY','SECONDARY','HANDOFF')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ENDED','CANCELLED')),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_nursing_observations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  encounter_id uuid,
  recorded_by uuid not null,
  observed_at timestamptz not null default now(),
  temperature_c numeric(5,2),
  heart_rate integer,
  respiratory_rate integer,
  systolic_bp integer,
  diastolic_bp integer,
  spo2 numeric(5,2),
  pain_score numeric(3,1),
  consciousness text,
  oxygen_support text,
  notes text,
  source text not null default 'NURSING' check (source in ('NURSING','ED','ICU','INPATIENT','OTHER')),
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_nursing_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  encounter_id uuid,
  nurse_staff_id uuid not null,
  assessment_type text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','SIGNED','AMENDED')),
  findings jsonb not null default '{}'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  escalation_required boolean not null default false,
  assessed_at timestamptz not null default now(),
  signed_at timestamptz,
  amended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_nursing_care_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  encounter_id uuid,
  created_by uuid not null,
  status text not null default 'ACTIVE' check (status in ('DRAFT','ACTIVE','COMPLETED','CANCELLED')),
  goals jsonb not null default '[]'::jsonb,
  interventions jsonb not null default '[]'::jsonb,
  review_due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_nursing_handoffs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  encounter_id uuid,
  from_nurse_staff_id uuid not null,
  to_nurse_staff_id uuid,
  handoff_type text not null default 'SHIFT' check (handoff_type in ('SHIFT','TRANSFER','ESCALATION','DISCHARGE')),
  summary text not null,
  pending_tasks jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_nursing_tasks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  encounter_id uuid,
  assigned_to uuid,
  created_by uuid not null,
  task_type text not null,
  priority text not null default 'ROUTINE' check (priority in ('ROUTINE','URGENT','STAT')),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED')),
  due_at timestamptz,
  instructions text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_nursing_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid,
  encounter_id uuid,
  actor_staff_id uuid,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clinic_nursing_assignments_patient_idx on public.clinic_nursing_assignments(patient_id, status, assigned_at desc);
create index if not exists clinic_nursing_assignments_nurse_idx on public.clinic_nursing_assignments(nurse_staff_id, status);
create index if not exists clinic_nursing_observations_patient_idx on public.clinic_nursing_observations(patient_id, observed_at desc);
create index if not exists clinic_nursing_assessments_patient_idx on public.clinic_nursing_assessments(patient_id, assessed_at desc);
create index if not exists clinic_nursing_tasks_queue_idx on public.clinic_nursing_tasks(assigned_to, status, priority, due_at);
create index if not exists clinic_nursing_events_patient_idx on public.clinic_nursing_events(patient_id, created_at desc);
