# AZAAD — Release Evidence: Patient Safety / Authorization

**Workstream:** Controlled Evolution — Patient Safety / Authorization  
**Risk:** HIGH  
**Evidence commit:** `7b1c7c6d581cf3bd8be8454ded4c40b6b4ffd6a6`  
**Branch:** `main`  
**Date:** 2026-08-17

## Scope

This record captures fresh production-database evidence for the patient and clinical-data authorization hardening already applied to the active Supabase project.

## Security / Authorization Evidence

Verified in the active Supabase project `derofsthjivlkcdnojww`:

- RLS is enabled on `public.clinic_patients`.
- RLS is enabled on `public.clinic_patient_medical_profiles`.
- `clinic_patients` SELECT is restricted through `security.can_access_patient(...)` for `authenticated`.
- Clinical medical-profile SELECT/INSERT/UPDATE are restricted through `security.can_access_patient_clinical(...)` for `authenticated`.
- Both authorization helpers are `SECURITY DEFINER` functions in the non-public `security` schema.
- Both helpers use `SET search_path TO ''`.
- The helpers enforce active staff identity and doctor-to-patient linkage through bookings or clinical visits.
- The security advisor currently reports no new patient-isolation warning; the remaining warnings are the pre-existing authenticated SECURITY DEFINER RPC warnings for `clinic_frontdesk_checkin` / `clinic_start_clinical_visit` and the documented free-plan leaked-password limitation.

## Database Verification Result

**PASS — structural authorization evidence.**

The evidence confirms the intended RLS/policy boundary is present in the active database. This does not by itself prove every authenticated positive/negative browser path.

## Production Deployment Evidence

The current `main` commit has a Vercel production deployment record, but Vercel marked the deployment as **CANCELED** because the repository `ignoreCommand` correctly classified this documentation-only change as not requiring a new application deployment.

Therefore the latest production application deployment remains the previously successful application commit, while this evidence commit changes documentation only.

## Browser / UAT Gate

**NOT PROVEN** for exact commit `7b1c7c6d581cf3bd8be8454ded4c40b6b4ffd6a6`.

A fresh exact-commit Production Browser E2E run is still required before this high-risk authorization work can be certified as a release candidate.

## Certification State

**NOT PROVEN**

Reason: required exact-commit production browser/UAT evidence is not present for this release evidence record.

No production certification claim is made from the database evidence alone.

## Next Gate

Run the existing Production Browser E2E/security/UAT evidence path against the exact release candidate. Certification may advance only after all applicable gates are fresh and passing.
