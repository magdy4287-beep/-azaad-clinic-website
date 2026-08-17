# AZAAD — Patient Safety & Authorization Evidence

**Controlled Evolution Workstream: Patient Safety / Authorization**

Status: **IMPLEMENTED / DATABASE-VERIFIED / PRODUCTION RELEASE NOT YET CERTIFIED**

## Scope

The first Controlled-Evolution authorization hardening targets patient and clinical-data isolation.

## Finding

Before this work, the `clinic_patients` SELECT policy allowed any authenticated staff member with the `patient` permission to read all patient rows. The `clinic_patient_medical_profiles` SELECT/INSERT/UPDATE policies similarly relied on broad permission checks and did not enforce doctor-to-patient scope at the patient row boundary.

## Implemented Controls

Supabase migrations applied:

- `20260817080029_harden_doctor_patient_isolation`
- `20260817080109_enforce_patient_and_clinical_access_scope`

The effective controls now enforce:

- non-doctor operational roles retain authorized patient access;
- doctors can access patient records only when the patient is linked to that doctor's booking or clinical visit;
- clinical medical profiles are limited to owner/admin/manager access or the assigned doctor's linked patients;
- medical-profile INSERT and UPDATE now use the same patient-scope authorization boundary;
- helper functions are `SECURITY DEFINER`, use an empty search path, live in the non-public `security` schema, and are executable only by `authenticated` for policy evaluation;
- supporting doctor/patient indexes are present for the new authorization predicates.

## Verification

Fresh database verification confirmed:

- RLS is enabled on the affected tables.
- The doctor can access the currently linked patient.
- The doctor cannot access an unknown/unlinked patient identifier through the authorization helper.
- The doctor cannot access an unknown/unlinked clinical profile through the clinical authorization helper.
- The affected policies are present with `TO authenticated`.

A direct attempt to use the legacy `clinic_current_doctor_id()` function from an impersonated `authenticated` SQL session correctly returned `permission denied`, confirming that the internal helper remains protected. The new policy path therefore uses the dedicated non-public security helpers rather than restoring broad direct execution of internal public functions.

## Release State

This work changes authorization behavior and is therefore **High Risk** under `AZAAD_CONTROLLED_EVOLUTION_FEATURE_DELIVERY_PLAN.md`.

It is **not** automatically certified for production. The release candidate still requires the normal security regression, UAT, production browser verification, exact-commit evidence, and release gate.

## Next Verification

Run the production/security gates against the exact release candidate, then certify only if all applicable gates pass. Missing evidence remains `NOT PROVEN`.
