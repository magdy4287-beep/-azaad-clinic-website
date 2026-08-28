alter table public.clinic_ai_insights
  add column if not exists review_status text not null default 'PENDING',
  add column if not exists reviewed_by uuid null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists review_note text null;

alter table public.clinic_ai_insights
  drop constraint if exists clinic_ai_insights_review_status_chk;

alter table public.clinic_ai_insights
  add constraint clinic_ai_insights_review_status_chk
  check (review_status in ('PENDING','APPROVED','REJECTED')) not valid;
