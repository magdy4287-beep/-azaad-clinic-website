# AZAAD — Controlled Evolution Certification Baseline

**Status:** ACTIVE / NOT CERTIFIED

## Purpose

This document freezes the controlled-evolution verification boundary after Emergency DR closure. It does not reopen, repeat, or modify the Emergency DR process.

## Certification baseline contract

- Supabase remains the rollback/reference source.
- Emergency DR is closed and must not be re-entered for controlled evolution.
- No production cutover is authorized by this document.
- No uncontrolled production mutation is authorized.
- Every repair is bounded, exact-commit evidenced, and fail-closed.
- P2/P3 work remains blocked while P0/P1 findings remain unresolved.
- Free-Only remains mandatory.
- Neon parity verification in this phase is strictly read-only; no restore, migration, dump replay, or target mutation is permitted.

## Current gates

| Gate | State | Evidence / blocker |
|---|---|---|
| Emergency DR | CLOSED | Historical DR gate remains closed; no reopening required |
| Certification baseline | PINNED | Immutable branch `certification/baseline-2026-09-02-558f3663` points to `main` SHA `558f3663a4dfaf78b07c916eea24e3050bf0029b` |
| Provider-neutral runtime boundary | ACTIVE | Neon database boundary implemented; Supabase runtime explicitly forbidden on the controlled branch |
| Neon runtime reachability | PASS | Latest controlled Vercel runtime-health reached a Neon database and verified its required runtime tables |
| Neon data parity | **P0 BLOCKED** | Read-only reconciliation proved the GitHub Actions `NEON_DATABASE_URL` target is not the same data target represented by the current Vercel runtime. CI target fingerprint: `69b433b6f1a939f6f37e810606eae1f8345547c43cf83cf524dbf48aa18a05f7`; current Vercel runtime fingerprint: `efcfb7176b16b62192ca9d8e15515d8fd20e5fc670704f271305eee62ef6e410`. These are different targets. Authoritative counts: `clinic_ai_insights` 297 vs missing, `clinic_audit_log` 809 vs missing, `clinic_bookings` 1150 vs 0, `clinic_clinical_visits` 399 vs missing, `clinic_doctors` 12 vs missing, `clinic_invoices` 401 vs missing, `clinic_patients` 573 vs missing, `clinic_services` 4 vs missing, `clinic_settings` 1 vs missing, `clinic_working_hours` 7 vs missing. No mutation was performed. |
| Vercel build | PASS | Latest controlled deployment reached READY; build logs completed without build errors |
| Production artifact parity | **P0 BLOCKED** | Production alias `azaad-clinic-website.vercel.app` currently resolves to deployment `dpl_AX4Qqm9Lgmyit9y4GZngY7Sxjf9e` built from `main` ancestor `b61a31a9b4e360ba75dce972f9a44eac10967a57`; current `main` is `558f3663a4dfaf78b07c916eea24e3050bf0029b`, 11 commits ahead. Production is therefore not the current baseline artifact. No production cutover is authorized until the certified artifact is ready. |
| Provider-neutral runtime health | BLOCKED | Current Vercel runtime is missing Appwrite endpoint/project/API-key configuration and explicit Appwrite identity-provider configuration; runtime contract is now Appwrite-only and fail-closed |
| Authentication | P0 BLOCKED | Existing Admin authentication path still depends on Supabase staff-login/Realtime and receives HTTP 402 under the current provider limit; the root cause is the remaining provider runtime dependency, not a test bypass |
| Public Booking | NOT PROVEN | Provider-neutral runtime implementation exists; schema/data parity and targeted end-to-end behavior remain gated |
| Security | BLOCKED BY OPEN FINDINGS | SECURITY DEFINER advisory requires architectural review; leaked-password protection remains disabled |
| Clinical E2E | BLOCKED | Depends on provider-neutral identity, runtime data parity, and authorization evidence |
| Financial E2E | BLOCKED | Depends on runtime/data parity and authorization evidence |
| Canonical production artifact parity | NOT PROVEN | Requires same-contract PR/build/production evidence after the provider-neutral boundary is operational |
| Final Security Certification | BLOCKED | P0/P1 evidence incomplete |
| Go-Live Certification | BLOCKED | Required gates not yet all proven |

## Production Health Audit — 2026-09-02

The audit was performed read-only across GitHub, Vercel, and the rollback/reference Supabase project.

### Positive evidence

- Current `main` is healthy enough for the repository Operations Health workflow: latest main run `33594696908` completed successfully and its production Vercel health check passed.
- Current Vercel runtime error aggregation reported no runtime errors in the preceding 24 hours.
- The controlled PR head `720b26b527ebde65049eb25c4d52c306ba4ca8ff` has successful Vercel deployment status and the security regression gate passed.
- Supabase project status is `ACTIVE_HEALTHY`.
- Supabase Auth logs show successful controlled authentication activity; this does not prove the production Admin path is provider-neutral.

### Critical artifact finding

The production alias is not serving the current `main` SHA. The production deployment metadata identifies `b61a31a9b4e360ba75dce972f9a44eac10967a57`, while `main` is `558f3663a4dfaf78b07c916eea24e3050bf0029b`. A direct Git comparison shows `main` is 11 commits ahead of the production SHA. This is a release-boundary defect and is classified P0 because exact-commit certification cannot be trusted while production and source-of-truth diverge.

The repository's canonical Browser E2E workflow already contains a fail-closed wait for `<meta name="azaad-build-sha">` to equal the exact GitHub SHA before production browser execution. Therefore the correct repair is to restore artifact/deployment alignment under controlled release governance, not to weaken or bypass the check.

## Verified findings driving controlled repair

### P0 — Provider-neutral authentication/runtime dependency

Production Browser E2E evidence established that the current Admin authentication path still calls the Supabase `staff-login` Edge Function and Supabase Realtime. The provider responds with HTTP 402, causing CORS failure and preventing the Admin shell from activating. The correct root cause is therefore a remaining runtime dependency on Supabase, not a Browser E2E defect. Tests remain fail-closed and are not bypassed.

### P0 — Authoritative Neon target mismatch

The read-only parity gate established a critical environment-boundary defect: the database referenced by the GitHub Actions `NEON_DATABASE_URL` secret is not the database represented by the current Vercel runtime. The latest evidence is independently consistent: GitHub Actions connected to `neondb|neondb_owner` with target fingerprint `69b433b6f1a939f6f37e810606eae1f8345547c43cf83cf524dbf48aa18a05f7`, while Vercel runtime-health connected to a different target with fingerprint `efcfb7176b16b62192ca9d8e15515d8fd20e5fc670704f271305eee62ef6e410` and reported all required runtime tables present. This cannot be reconciled by another restore because Emergency DR is closed and no new transfer is authorized. The correct repair is to identify and align the existing Vercel `DATABASE_URL` with the already-restored authoritative Neon target, then re-run read-only parity.

### P0 — Production artifact drift

The production alias currently points to an older `main` ancestor rather than the current baseline SHA. This must be corrected only through the normal controlled release path after P0/P1 runtime and identity blockers are closed. No direct production mutation is performed as part of the audit.

### P0 — Provider runtime configuration

The controlled Vercel runtime is fail-closed because the Appwrite endpoint/project/API-key and explicit Appwrite identity-provider configuration are not present. The runtime contract now rejects any identity provider other than Appwrite and requires the server-side Appwrite API key for provider readiness.

### P1 — Public Booking transaction correctness

The public booking transaction contained an `update_existing` CTE that was not referenced by the patient-selection path. The controlled repair now makes `target_patient` consume `update_existing`, ensuring an existing patient's supplied profile fields are actually enriched before the booking is inserted.

### P1 — Security architecture drift

The live Supabase database currently exposes `public.clinic_frontdesk_checkin(uuid,text)` as `SECURITY DEFINER` and executable by `authenticated`. Repository migrations previously moved sensitive implementation behind a private schema with an invoker wrapper, while a later migration intentionally reasserted authenticated execution. This is therefore treated as architectural drift requiring reconciliation with the intended authorization contract, not as a blind revoke operation.

### P1 — Auth leaked-password protection

Supabase Security Advisor reports leaked-password protection disabled. This remains a security finding and is not converted into a paid-plan requirement.

### P2 — Public media rendering

The latest Browser E2E observed zero rendered images on the local canonical build for the public media test. This remains explicitly deferred because P0/P1 runtime and identity blockers must be resolved first.

## Process corrections applied in this phase

- Emergency restore implementations were removed from the controlled-evolution diff; the closed DR scripts are no longer modified by PR #94.
- The Neon parity gate was converted from a stateful restore workflow to a strictly read-only reconciliation workflow.
- The provider-readiness workflow shell-expansion defect in the bcrypt query was fixed.
- The runtime contract now requires Appwrite explicitly rather than accepting an arbitrary non-Supabase provider.
- Runtime-health now emits a non-secret database-target fingerprint so environment drift can be diagnosed without exposing connection credentials.
- The latest runtime evidence confirms the fingerprint mismatch directly; no inference from row counts alone is being used for the environment-boundary diagnosis.
- Production artifact drift is now explicitly classified as P0; exact-SHA Browser E2E remains fail-closed.

## Exit criteria for this baseline

This baseline may advance toward certification only when fresh evidence proves:

1. the existing authoritative Neon target is the same target used by Vercel;
2. authoritative Neon data parity through read-only reconciliation;
3. runtime-critical schema/function parity;
4. provider-neutral identity/session boundary operationally replaces Supabase runtime authentication;
5. the production deployment artifact exactly matches the certified GitHub SHA;
6. Public Booking targeted behavior and Browser E2E;
7. production build/runtime parity;
8. clinical authorization E2E;
9. final security/RLS/RPC/Auth/Storage/AI checks;
10. production smoke and browser evidence on the certified artifact.

Until then the state is **NOT PROVEN**, not Certified.
