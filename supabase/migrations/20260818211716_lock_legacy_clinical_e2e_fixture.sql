-- AZAAD security cleanup: retire the superseded single-fixture clinical E2E RPC.
-- The active suite uses clinic_prepare_controlled_clinical_e2e_suite().
-- Keep the legacy function definition for migration compatibility, but remove
-- authenticated/public execution so it cannot be used as an alternate fixture path.
REVOKE EXECUTE ON FUNCTION public.clinic_prepare_controlled_clinical_e2e_fixture() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_prepare_controlled_clinical_e2e_fixture() FROM anon;
REVOKE EXECUTE ON FUNCTION public.clinic_prepare_controlled_clinical_e2e_fixture() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_prepare_controlled_clinical_e2e_fixture() TO service_role;
