# AZAAD — Controlled Evolution Evidence: Patient Safety / Authorization

**Status:** ACTIVE / HIGH-RISK / EVIDENCE-GATED
**Date:** 2026-08-17
**Base plan:** `AZAAD_PRODUCTION_CERTIFICATION_CONTINUOUS_OPERATIONS_PLAN.md`
**Feature plan:** `AZAAD_CONTROLLED_EVOLUTION_FEATURE_DELIVERY_PLAN.md`

## Master Delivery Contract

`Secure & Safety-Gated Production → Controlled Feature Evolution → Patient/Clinical/Financial E2E → Human-Approved AI → Security/UAT Certification → Go-Live → Continuous Operations`

Centralized Arabic/English bilingual support is limited to the Patient Dashboard and Administration Dashboard.

## Workstream

First controlled-evolution workstream: **Patient Safety / Authorization**.
Risk classification: **HIGH**.

## Fresh Production Database Evidence

Verified against the active Supabase project:

- `public.clinic_patients` has RLS enabled.
- `public.clinic_patient_medical_profiles` has RLS enabled.
- Patient SELECT policy is scoped to authenticated staff through the patient authorization boundary.
- Clinical medical-profile SELECT/INSERT/UPDATE policies are scoped to authenticated staff through the clinical authorization boundary.
- `security.can_access_patient(uuid)` exists as `SECURITY DEFINER`, is executable by `authenticated`, and has `search_path` constrained to an empty value.
- `security.can_access_patient_clinical(uuid)` exists as `SECURITY DEFINER`, is executable by `authenticated`, and has `search_path` constrained to an empty value.

## Evidence Interpretation

**PASS — structural database authorization controls are present in the active production database.**

This is not final feature certification. The workstream remains open until the complete application authorization boundary is traced and the required negative tests and exact-commit production browser/UAT evidence are fresh and passing.

## Required Remaining Gates

1. Trace every patient/clinical UI path, RPC, Edge Function, and endpoint that reads or mutates patient/clinical data.
2. Verify authenticated identity and role enforcement end-to-end.
3. Verify cross-patient isolation and IDOR resistance.
4. Verify doctor-to-patient clinical scope.
5. Verify direct RPC/endpoint calls cannot bypass the same authorization boundary.
6. Verify SECURITY DEFINER least-privilege semantics for all affected helpers.
7. Execute negative authorization tests.
8. Run exact-commit production browser/UAT evidence.
9. Apply Security + Clinical Safety + Release certification gates.

## Certification State

**NOT PROVEN** — required application-level and production E2E evidence is not yet complete.

No production certification claim is made from structural database evidence alone.

## Free-Only Rule

No paid dependency or Vercel plan upgrade is required or authorized to close this workstream.

## Next Action

Continue evidence-first discovery and implementation only where a concrete application authorization gap is proven. Preserve the certified production baseline and require a fresh exact-commit release candidate for any application change.
