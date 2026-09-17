-- Canonical Neon persistence for assistive AI recommendations.
-- AI remains advisory; human staff own acceptance/rejection.
create table if not exists public.clinic_ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  department text,
  role text,
  context_type text not null,
  context_id uuid,
  recommendation text not null,
  evidence jsonb not null default '{}'::jsonb,
  provider text not null default 'local-free',
  status text not null default 'PROPOSED' check(status in ('PROPOSED','ACCEPTED','REJECTED','EXPIRED')),
  human_actor_staff_id uuid references public.clinic_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists clinic_ai_recommendations_context_idx
  on public.clinic_ai_recommendations(context_type,context_id,created_at desc);
create index if not exists clinic_ai_recommendations_actor_idx
  on public.clinic_ai_recommendations(human_actor_staff_id);
