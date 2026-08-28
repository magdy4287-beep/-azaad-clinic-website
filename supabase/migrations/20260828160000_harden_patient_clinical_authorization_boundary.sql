-- High-risk Controlled Evolution: patient/clinical authorization boundary hardening.
-- Scope: clinical assessment data + patient transfer records + accidental direct execution of trigger-only helpers.

DROP POLICY IF EXISTS assessment_sessions_clinical_access ON public.clinical_assessment_sessions;
CREATE POLICY assessment_sessions_clinical_access
  ON public.clinical_assessment_sessions
  FOR ALL
  TO authenticated
  USING (security.can_access_patient_clinical(patient_id))
  WITH CHECK (security.can_access_patient_clinical(patient_id));

DROP POLICY IF EXISTS assessment_answers_clinical_access ON public.clinical_assessment_answers;
CREATE POLICY assessment_answers_clinical_access
  ON public.clinical_assessment_answers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinical_assessment_sessions s
      WHERE s.id = clinical_assessment_answers.session_id
        AND security.can_access_patient_clinical(s.patient_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinical_assessment_sessions s
      WHERE s.id = clinical_assessment_answers.session_id
        AND security.can_access_patient_clinical(s.patient_id)
    )
  );

DROP POLICY IF EXISTS patient_transfers_staff_insert ON public.clinic_patient_transfers;
CREATE POLICY patient_transfers_clinical_insert
  ON public.clinic_patient_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (security.can_access_patient_clinical(patient_id));

DROP POLICY IF EXISTS patient_transfers_staff_select ON public.clinic_patient_transfers;
CREATE POLICY patient_transfers_clinical_select
  ON public.clinic_patient_transfers
  FOR SELECT
  TO authenticated
  USING (security.can_access_patient_clinical(patient_id));

DROP POLICY IF EXISTS patient_transfers_staff_update ON public.clinic_patient_transfers;
CREATE POLICY patient_transfers_clinical_update
  ON public.clinic_patient_transfers
  FOR UPDATE
  TO authenticated
  USING (security.can_access_patient_clinical(patient_id))
  WITH CHECK (security.can_access_patient_clinical(patient_id));

-- Trigger/helper functions must not be exposed as arbitrary RPC entry points.
REVOKE EXECUTE ON FUNCTION public.apply_default_doctor_services() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_default_doctor_booking_settings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_doctor_service_defaults_on_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_guard_doctor_schedule_active() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_sync_doctor_schedule_lifecycle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_inactive_doctor_no_public_schedule() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.broadcast_scheduling_invalidation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.azaad_expense_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.azaad_guard_invoice_mutation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.azaad_guard_paid_expense() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.azaad_invoice_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_unapproved_refund_processing() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_block_unverified_service() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_bookings_set_patient_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_enforce_bank_transfer_verification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_payment_workflow_after_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_sync_payment_workflow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_sync_verified_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_validate_booking_status_transition() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_validate_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clinic_waiting_list_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_bank_refund_admin_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_refund_approval_rules() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_refund_rejection_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_clinic_booking_overlap() FROM PUBLIC, anon, authenticated;
