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
| Provider-neutral runtime boundary | ACTIVE | Neon database boundary implemented; Supabase runtime explicitly forbidden on the controlled branch |
| Neon runtime reachability | PASS | Latest controlled Vercel runtime-health reached a Neon database and verified its required runtime tables |
| Neon data parity | **P0 BLOCKED** | Read-only reconciliation proved the GitHub Actions `NEON_DATABASE_URL` target is not the same data target represented by the current Vercel runtime. Authoritative counts: `clinic_ai_insights` 297 vs missing, `clinic_audit_log` 809 vs missing, `clinic_bookings` 1150 vs 0, `clinic_clinical_visits` 399 vs missing, `clinic_doctors` 12 vs missing, `clinic_invoices` 401 vs missing, `clinic_patients` 573 vs missing, `clinic_services` 4 vs missing, `clinic_settings` 1 vs missing, `clinic_working_hours` 7 vs missing. No mutation was performed. |
| Vercel build | PASS | Latest controlled deployment reached READY; build logs completed without build errors |
| Provider-neutral runtime health | BLOCKED | Vercel runtime is missing Appwrite endpoint/project/API-key configuration and explicit Appwrite identity-provider configuration; runtime contract is now Appwrite-only and fail-closed |
| Authentication | P0 BLOCKED | Existing Admin authentication path still depends on Supabase staff-login/Realtime and receives HTTP 402 under the current provider limit; the root cause is the remaining provider runtime dependency, not a test bypass |
| Public Booking | NOT PROVEN | Provider-neutral runtime implementation exists; schema/data parity and targeted end-to-end behavior remain gated |
| Security | BLOCKED BY OPEN FINDINGS | SECURITY DEFINER advisory requires architectural review; leaked-password protection remains disabled |
| Clinical E2E | BLOCKED | Depends on provider-neutral identity, runtime data parity, and authorization evidence |
| Financial E2E | BLOCKED | Depends on runtime/data parity and authorization evidence |
| Canonical production artifact parity | NOT PROVEN | Requires same-contract PR/build/production evidence after the provider-neutral boundary is operational |
| Final Security Certification | BLOCKED | P0/P1 evidence incomplete |
| Go-Live Certification | BLOCKED | Required gates not yet all proven |

## Verified findings driving controlled repair

### P0 — Provider-neutral authentication/runtime dependency

Production Browser E2E proved that the current Admin authentication path still calls the Supabase `staff-login` Edge Function and Supabase Realtime. The provider responds with HTTP 402, causing CORS failure and preventing the Admin shell from activating. The correct root cause is therefore a remaining runtime dependency on Supabase, not a Browser E2E defect. Tests remain fail-closed and are not bypassed.

### P0 — Authoritative Neon target mismatch

The read-only parity gate established a critical environment-boundary defect: the database referenced by the GitHub Actions `NEON_DATABASE_URL` secret is not the database represented by the current Vercel runtime. The CI target is missing most authoritative clinical tables, while Vercel runtime-health reports those tables present. This cannot be reconciled by another restore because Emergency DR is closed and no new transfer is authorized. The correct repair is to identify and align the existing Vercel `DATABASE_URL` with the already-restored authoritative Neon target, then re-run read-only parity.

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

## Exit criteria for this baseline

This baseline may advance toward certification only when fresh evidence proves:

1. the existing authoritative Neon target is the same target used by Vercel;
2. authoritative Neon data parity through read-only reconciliation;
3. runtime-critical schema/function parity;
4. provider-neutral identity/session boundary operationally replaces Supabase runtime authentication;
5. Public Booking targeted behavior and Browser E2E;
6. production build/runtime parity;
7. clinical authorization E2E;
8. final security/RLS/RPC/Auth/Storage/AI checks;
9. production smoke and browser evidence on the certified artifact.

Until then the state is **NOT PROVEN**, not Certified.
