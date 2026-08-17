-- AZAAD security hardening: remove anonymous EXECUTE from privileged SECURITY DEFINER RPCs.
-- Authenticated execution remains only where the function body performs explicit role/scope checks.
REVOKE EXECUTE ON FUNCTION public.owner_set_staff_account_status(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.owner_set_staff_account_status(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clinic_prepare_controlled_clinical_e2e_fixture() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_frontdesk_checkin(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_start_clinical_visit(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_update_patient_demographics(uuid, text, text, text, date, numeric, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_update_patient_demographics(uuid, text, text, text, date, numeric, numeric, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.owner_set_staff_account_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_prepare_controlled_clinical_e2e_fixture() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_frontdesk_checkin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_start_clinical_visit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_update_patient_demographics(uuid, text, text, text, date, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_update_patient_demographics(uuid, text, text, text, date, numeric, numeric, text, text, text) TO authenticated;
