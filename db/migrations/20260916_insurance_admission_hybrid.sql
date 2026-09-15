BEGIN;

CREATE TABLE IF NOT EXISTS public.clinic_insurance_payers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payer_code text NOT NULL UNIQUE, payer_name text NOT NULL, payer_name_en text,
  payer_type text NOT NULL DEFAULT 'private' CHECK (payer_type IN ('private','government','employer','tpa','other')),
  country_code text, portal_url text, integration_mode text NOT NULL DEFAULT 'manual' CHECK (integration_mode IN ('manual','portal_assisted','fhir_pas','x12_278','national_gateway','custom_api')),
  eligibility_supported boolean NOT NULL DEFAULT false, prior_authorization_supported boolean NOT NULL DEFAULT true, claims_supported boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_patient_coverages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.clinic_patients(id), payer_id uuid NOT NULL REFERENCES public.clinic_insurance_payers(id),
  policy_number text NOT NULL, member_id text, group_number text, plan_name text, plan_name_en text, subscriber_name text, subscriber_id text,
  subscriber_relationship text NOT NULL DEFAULT 'self' CHECK (subscriber_relationship IN ('self','spouse','child','parent','other')),
  effective_from date, effective_to date, coverage_status text NOT NULL DEFAULT 'unverified' CHECK (coverage_status IN ('unverified','active','inactive','expired','pending_verification','suspended')),
  network_type text, card_number text, authorization_required boolean NOT NULL DEFAULT true, copay_amount numeric(14,2), deductible_amount numeric(14,2),
  coinsurance_percent numeric(5,2), annual_limit numeric(14,2), remaining_limit numeric(14,2), exclusions text, notes text, source text NOT NULL DEFAULT 'reception_manual',
  verified_at timestamptz, verified_by uuid REFERENCES public.clinic_staff(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_insurance_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.clinic_patients(id), coverage_id uuid NOT NULL REFERENCES public.clinic_patient_coverages(id),
  booking_id uuid REFERENCES public.clinic_bookings(id), clinical_visit_id uuid REFERENCES public.clinic_clinical_visits(id), payer_reference text, request_number text UNIQUE,
  authorization_type text NOT NULL DEFAULT 'prior_authorization' CHECK (authorization_type IN ('eligibility','prior_authorization','concurrent','extension','retrospective','guarantee_of_payment')),
  service_setting text NOT NULL DEFAULT 'outpatient' CHECK (service_setting IN ('outpatient','day_surgery','inpatient','emergency','home_care','other')),
  requested_start date, requested_end date, requested_days integer, requested_services jsonb NOT NULL DEFAULT '[]'::jsonb, diagnosis_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  clinical_summary text, estimated_amount numeric(14,2), currency_code text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','submitted','pending_payer','more_information_required','approved','partially_approved','denied','cancelled','expired','closed')),
  submission_channel text NOT NULL DEFAULT 'manual_portal' CHECK (submission_channel IN ('manual_portal','phone','email','fhir_pas','x12_278','national_gateway','custom_api')),
  submitted_at timestamptz, responded_at timestamptz, approved_amount numeric(14,2), approved_days integer, approval_code text, denial_reason text,
  payer_response jsonb NOT NULL DEFAULT '{}'::jsonb, created_by uuid REFERENCES public.clinic_staff(id), reviewed_by uuid REFERENCES public.clinic_staff(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_insurance_authorization_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), authorization_id uuid NOT NULL REFERENCES public.clinic_insurance_authorizations(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.clinic_services(id), service_code text, service_name text, quantity numeric(12,2) NOT NULL DEFAULT 1, unit_amount numeric(14,2), requested_amount numeric(14,2), approved_quantity numeric(12,2), approved_amount numeric(14,2),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','partially_approved','denied','cancelled')), notes text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_insurance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.clinic_patients(id), coverage_id uuid REFERENCES public.clinic_patient_coverages(id), authorization_id uuid REFERENCES public.clinic_insurance_authorizations(id),
  document_type text NOT NULL CHECK (document_type IN ('insurance_card_front','insurance_card_back','id_document','referral','clinical_report','lab_result','imaging_report','prescription','estimate','authorization_response','other')),
  file_reference text, document_hash text, extracted_fields jsonb NOT NULL DEFAULT '{}'::jsonb, uploaded_by uuid REFERENCES public.clinic_staff(id), created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_insurance_submission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), authorization_id uuid NOT NULL REFERENCES public.clinic_insurance_authorizations(id) ON DELETE CASCADE, event_type text NOT NULL,
  channel text NOT NULL, external_reference text, message text, payload jsonb NOT NULL DEFAULT '{}'::jsonb, actor_staff_id uuid REFERENCES public.clinic_staff(id), created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_insurance_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), authorization_id uuid NOT NULL REFERENCES public.clinic_insurance_authorizations(id) ON DELETE CASCADE,
  model_provider text NOT NULL DEFAULT 'azaad_rules', model_name text, review_type text NOT NULL CHECK (review_type IN ('completeness','coding_support','coverage_risk','documentation_gap','submission_draft','denial_analysis')),
  confidence numeric(5,4), findings jsonb NOT NULL DEFAULT '[]'::jsonb, suggested_actions jsonb NOT NULL DEFAULT '[]'::jsonb, generated_text text,
  human_review_required boolean NOT NULL DEFAULT true, human_reviewed_by uuid REFERENCES public.clinic_staff(id), human_decision text CHECK (human_decision IS NULL OR human_decision IN ('accepted','rejected','modified','pending')), created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_admission_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_code text NOT NULL UNIQUE, room_name text, room_name_en text, ward_name text, ward_name_en text,
  room_type text NOT NULL DEFAULT 'standard' CHECK (room_type IN ('standard','semi_private','private','icu','isolation','day_surgery','other')), capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0), gender_policy text NOT NULL DEFAULT 'any' CHECK (gender_policy IN ('any','male','female')),
  active boolean NOT NULL DEFAULT true, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_admission_beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES public.clinic_admission_rooms(id), bed_code text NOT NULL UNIQUE,
  bed_status text NOT NULL DEFAULT 'available' CHECK (bed_status IN ('available','reserved','occupied','cleaning','blocked','maintenance')), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_admission_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.clinic_patients(id), booking_id uuid REFERENCES public.clinic_bookings(id), clinical_visit_id uuid REFERENCES public.clinic_clinical_visits(id), primary_doctor_id uuid REFERENCES public.clinic_doctors(id), coverage_id uuid REFERENCES public.clinic_patient_coverages(id), authorization_id uuid REFERENCES public.clinic_insurance_authorizations(id),
  admission_number text NOT NULL UNIQUE, admission_type text NOT NULL DEFAULT 'planned' CHECK (admission_type IN ('planned','emergency','day_surgery','transfer','observation','other')),
  status text NOT NULL DEFAULT 'pre_admission' CHECK (status IN ('pre_admission','scheduled','admitted','in_treatment','discharge_planned','discharged','cancelled')),
  planned_admission_at timestamptz, admitted_at timestamptz, expected_discharge_at timestamptz, discharged_at timestamptz, reason text, diagnosis_summary text,
  deposit_required numeric(14,2), deposit_received numeric(14,2) NOT NULL DEFAULT 0, payer_guarantee_amount numeric(14,2), patient_estimated_share numeric(14,2),
  discharge_status text NOT NULL DEFAULT 'not_ready' CHECK (discharge_status IN ('not_ready','clinical_clearance','financial_clearance','insurance_clearance','ready','completed')),
  created_by uuid REFERENCES public.clinic_staff(id), discharged_by uuid REFERENCES public.clinic_staff(id), notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_admission_bed_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admission_id uuid NOT NULL REFERENCES public.clinic_admission_episodes(id) ON DELETE CASCADE, bed_id uuid NOT NULL REFERENCES public.clinic_admission_beds(id),
  assigned_at timestamptz NOT NULL DEFAULT now(), released_at timestamptz, assigned_by uuid REFERENCES public.clinic_staff(id), release_reason text
);

CREATE TABLE IF NOT EXISTS public.clinic_discharge_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admission_id uuid NOT NULL REFERENCES public.clinic_admission_episodes(id) ON DELETE CASCADE,
  clinical_clearance boolean NOT NULL DEFAULT false, medication_reconciliation boolean NOT NULL DEFAULT false, followup_scheduled boolean NOT NULL DEFAULT false, patient_instructions_completed boolean NOT NULL DEFAULT false,
  financial_clearance boolean NOT NULL DEFAULT false, insurance_clearance boolean NOT NULL DEFAULT false, final_invoice_id uuid REFERENCES public.clinic_invoices(id), final_claim_reference text, discharge_summary text,
  pending_items jsonb NOT NULL DEFAULT '[]'::jsonb, completed_at timestamptz, completed_by uuid REFERENCES public.clinic_staff(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_coverages_patient ON public.clinic_patient_coverages(patient_id, coverage_status);
CREATE INDEX IF NOT EXISTS idx_authorizations_patient_status ON public.clinic_insurance_authorizations(patient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_authorizations_coverage ON public.clinic_insurance_authorizations(coverage_id, status);
CREATE INDEX IF NOT EXISTS idx_authorization_items_authorization ON public.clinic_insurance_authorization_items(authorization_id);
CREATE INDEX IF NOT EXISTS idx_insurance_documents_patient ON public.clinic_insurance_documents(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_events_authorization ON public.clinic_insurance_submission_events(authorization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_authorization ON public.clinic_insurance_ai_reviews(authorization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admission_patient_status ON public.clinic_admission_episodes(patient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admission_authorization ON public.clinic_admission_episodes(authorization_id);
CREATE INDEX IF NOT EXISTS idx_bed_assignments_admission ON public.clinic_admission_bed_assignments(admission_id, released_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bed_assignment ON public.clinic_admission_bed_assignments(bed_id) WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_discharge_plans_admission ON public.clinic_discharge_plans(admission_id);

COMMIT;
