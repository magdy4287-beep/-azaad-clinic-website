-- AZAAD Emergency Department / ED canonical domain
-- Safety rule: triage/clinical care is never blocked by payment routing.
CREATE TABLE IF NOT EXISTS public.clinic_ed_encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_number text UNIQUE NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.clinic_patients(id),
  coverage_id uuid REFERENCES public.clinic_patient_coverages(id),
  authorization_id uuid REFERENCES public.clinic_insurance_authorizations(id),
  arrival_mode text NOT NULL DEFAULT 'walk_in',
  arrival_at timestamptz NOT NULL DEFAULT now(),
  chief_complaint text,
  presenting_problem text,
  triage_system text NOT NULL DEFAULT 'ESI',
  triage_level integer,
  triage_color text,
  triage_reason text,
  triaged_at timestamptz,
  triaged_by uuid REFERENCES public.clinic_staff(id),
  assigned_doctor_id uuid REFERENCES public.clinic_staff(id),
  assigned_nurse_id uuid REFERENCES public.clinic_staff(id),
  status text NOT NULL DEFAULT 'arrived',
  payment_route text NOT NULL DEFAULT 'clinical_first',
  payment_status text NOT NULL DEFAULT 'pending',
  patient_estimated_share numeric(14,2),
  payer_guarantee_amount numeric(14,2),
  clinical_summary text,
  disposition text,
  disposition_at timestamptz,
  disposition_by uuid REFERENCES public.clinic_staff(id),
  created_by uuid REFERENCES public.clinic_staff(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.clinic_ed_triage_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.clinic_ed_encounters(id) ON DELETE CASCADE,
  system text NOT NULL DEFAULT 'ESI',
  level integer,
  color text,
  high_risk boolean NOT NULL DEFAULT false,
  immediate_intervention boolean NOT NULL DEFAULT false,
  vitals jsonb NOT NULL DEFAULT '{}'::jsonb,
  red_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  assessed_by uuid REFERENCES public.clinic_staff(id),
  assessed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.clinic_ed_clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.clinic_ed_encounters(id) ON DELETE CASCADE,
  author_staff_id uuid REFERENCES public.clinic_staff(id),
  note_type text NOT NULL,
  subjective text,
  objective text,
  assessment text,
  plan text,
  diagnosis_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  procedures jsonb NOT NULL DEFAULT '[]'::jsonb,
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.clinic_ed_care_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.clinic_ed_encounters(id) ON DELETE CASCADE,
  ordered_by uuid REFERENCES public.clinic_staff(id),
  order_type text NOT NULL,
  order_name text NOT NULL,
  priority text NOT NULL DEFAULT 'routine',
  status text NOT NULL DEFAULT 'ordered',
  clinical_reason text,
  result_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.clinic_ed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.clinic_ed_encounters(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor_staff_id uuid REFERENCES public.clinic_staff(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.clinic_ed_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.clinic_ed_encounters(id) ON DELETE CASCADE,
  review_type text NOT NULL,
  model_provider text NOT NULL DEFAULT 'azaad_rules',
  model_name text NOT NULL DEFAULT 'ed-safety-copilot-v1',
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  human_review_required boolean NOT NULL DEFAULT true,
  human_decision text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.clinic_ed_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.clinic_ed_encounters(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  amount numeric(14,2),
  currency_code text NOT NULL DEFAULT 'EGP',
  invoice_id uuid,
  claim_reference text,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ed_encounters_patient_status ON public.clinic_ed_encounters(patient_id,status);
CREATE INDEX IF NOT EXISTS idx_ed_encounters_triage ON public.clinic_ed_encounters(triage_level,status,arrival_at);
CREATE INDEX IF NOT EXISTS idx_ed_triage_encounter ON public.clinic_ed_triage_assessments(encounter_id,assessed_at);
CREATE INDEX IF NOT EXISTS idx_ed_notes_encounter ON public.clinic_ed_clinical_notes(encounter_id,created_at);
CREATE INDEX IF NOT EXISTS idx_ed_orders_encounter ON public.clinic_ed_care_orders(encounter_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_ed_events_encounter ON public.clinic_ed_events(encounter_id,created_at);
CREATE INDEX IF NOT EXISTS idx_ed_billing_encounter ON public.clinic_ed_billing_events(encounter_id,created_at);
