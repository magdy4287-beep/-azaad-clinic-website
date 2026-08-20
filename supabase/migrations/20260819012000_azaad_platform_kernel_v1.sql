-- AZAAD Platform Kernel v1
-- Cross-cutting feature flags, versioned workflow policy, and AI usage traceability.
-- Additive only; core clinical/financial data is not rewritten.

create table if not exists public.clinic_feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default true,
  rollout_percent integer not null default 100 check (rollout_percent between 0 and 100),
  config jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null unique,
  version integer not null default 1 check (version > 0),
  active boolean not null default true,
  states jsonb not null default '[]'::jsonb,
  transitions jsonb not null default '[]'::jsonb,
  approval_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_staff_id uuid references public.clinic_staff(id) on delete set null,
  department text,
  feature_key text not null,
  provider text not null default 'local_free',
  advisory_only boolean not null default true,
  input_metadata jsonb not null default '{}'::jsonb,
  outcome_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_clinic_feature_flags_enabled on public.clinic_feature_flags(enabled);
create index if not exists idx_clinic_ai_usage_events_feature_created on public.clinic_ai_usage_events(feature_key, created_at desc);
create index if not exists idx_clinic_ai_usage_events_actor_created on public.clinic_ai_usage_events(actor_user_id, created_at desc);

alter table public.clinic_feature_flags enable row level security;
alter table public.clinic_workflow_definitions enable row level security;
alter table public.clinic_ai_usage_events enable row level security;

drop policy if exists clinic_feature_flags_select_authenticated on public.clinic_feature_flags;
create policy clinic_feature_flags_select_authenticated on public.clinic_feature_flags for select to authenticated using (true);
drop policy if exists clinic_feature_flags_owner_write on public.clinic_feature_flags;
create policy clinic_feature_flags_owner_write on public.clinic_feature_flags for all to authenticated using (public.clinic_has_permission('admin.settings')) with check (public.clinic_has_permission('admin.settings'));

drop policy if exists clinic_workflow_definitions_select_authenticated on public.clinic_workflow_definitions;
create policy clinic_workflow_definitions_select_authenticated on public.clinic_workflow_definitions for select to authenticated using (true);
drop policy if exists clinic_workflow_definitions_owner_write on public.clinic_workflow_definitions;
create policy clinic_workflow_definitions_owner_write on public.clinic_workflow_definitions for all to authenticated using (public.clinic_has_permission('admin.settings')) with check (public.clinic_has_permission('admin.settings'));

drop policy if exists clinic_ai_usage_events_actor_insert on public.clinic_ai_usage_events;
create policy clinic_ai_usage_events_actor_insert on public.clinic_ai_usage_events for insert to authenticated with check (actor_user_id = auth.uid());
drop policy if exists clinic_ai_usage_events_management_select on public.clinic_ai_usage_events;
create policy clinic_ai_usage_events_management_select on public.clinic_ai_usage_events for select to authenticated using (actor_user_id = auth.uid() or public.clinic_has_permission('reports.view'));

insert into public.clinic_feature_flags(key, enabled, rollout_percent, description) values
('platform.kernel', true, 100, 'Cross-cutting AZAAD platform guardrails and extension seam'),
('platform.ai_copilot', true, 100, 'Advisory AI copilot with human approval boundaries'),
('platform.workflow_engine', true, 100, 'Versioned workflow policy definitions'),
('platform.audit_timeline', true, 100, 'Unified audit timeline surfaces'),
('platform.executive_command_center', true, 100, 'Owner/management operational command center'),
('platform.patient_portal', true, 100, 'Privacy-safe patient self-service portal'),
('platform.marketing_hybrid', true, 100, 'Human plus AI marketing studio'),
('platform.direct_booking', true, 100, 'Shareable direct booking entry point')
on conflict (key) do update set enabled=excluded.enabled, rollout_percent=excluded.rollout_percent, description=excluded.description, updated_at=now();

insert into public.clinic_workflow_definitions(workflow_key, version, states, transitions, approval_policy) values
('refund',1,'["requested","doctor_approved","management_owner_approved","processed","rejected"]'::jsonb,'[{"from":"requested","to":"doctor_approved","role":"doctor"},{"from":"doctor_approved","to":"management_owner_approved","role":"management_or_owner"},{"from":"management_owner_approved","to":"processed","role":"authorized_finance"}]'::jsonb,'{"human_only":true,"ordered":true,"ai_can_approve":false}'::jsonb),
('appointment_cancel',1,'["requested","doctor_approved","management_owner_approved","cancelled","rejected"]'::jsonb,'[{"from":"requested","to":"doctor_approved","role":"doctor"},{"from":"doctor_approved","to":"management_owner_approved","role":"management_or_owner"},{"from":"management_owner_approved","to":"cancelled","role":"authorized_staff"}]'::jsonb,'{"human_only":true,"ordered":true,"ai_can_approve":false}'::jsonb),
('paid_marketing_publication',1,'["draft","human_approved","published","failed"]'::jsonb,'[{"from":"draft","to":"human_approved","role":"marketing_or_management"},{"from":"human_approved","to":"published","role":"authorized_marketing"}]'::jsonb,'{"human_only":true,"paid_spend_requires_explicit_human_action":true,"ai_can_approve":false}'::jsonb)
on conflict (workflow_key) do update set version=excluded.version, states=excluded.states, transitions=excluded.transitions, approval_policy=excluded.approval_policy, updated_at=now();
