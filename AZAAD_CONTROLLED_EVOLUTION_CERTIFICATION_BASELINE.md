# AZAAD — Controlled Evolution Certification Baseline

**Status:** ACTIVE / NOT CERTIFIED

## Purpose

This document freezes the current controlled-evolution verification boundary after Emergency DR closure. It does not reopen or modify the Emergency DR process.

## Certification baseline contract

- Supabase remains the rollback/reference source.
- No production cutover is authorized by this document.
- No uncontrolled production mutation is authorized.
- Every repair is bounded, exact-commit evidenced, and fail-closed.
- P2/P3 work remains blocked while P0/P1 findings remain unresolved.
- Free-Only remains mandatory.

## Current gates

| Gate | State | Evidence / blocker |
|---|---|---|
| Emergency DR | CLOSED | Historical DR gate remains closed; no reopening required |
| Provider-neutral runtime boundary | ACTIVE | Neon database boundary implemented; Supabase runtime explicitly forbidden |
| Neon runtime reachability | PASS | Latest controlled Vercel runtime-health reached Neon and verified required runtime tables |
| Neon data parity | NOT PROVEN | Corrected public+private authoritative restore exists, but fresh controlled execution/reconciliation evidence is still required |
| Vercel build | PASS | Latest controlled deployment reached READY; build logs completed without errors |
| Provider-neutral runtime health | BLOCKED | Neon is reachable and schema-complete, but Vercel runtime is missing Appwrite endpoint/project configuration and non-Supabase identity-provider configuration |
| Authentication | P0 BLOCKED | Production Browser E2E receives HTTP 402 from Supabase staff-login/Realtime because the Free-plan usage grace period has ended; this is an external provider dependency, not a test defect |
| Public Booking | NOT PROVEN | Runtime implementation exists; schema/data parity and end-to-end behavior remain gated |
| Security | BLOCKED BY OPEN FINDINGS | SECURITY DEFINER advisory requires architectural review; leaked-password protection remains disabled |
| Clinical E2E | BLOCKED | Depends on provider-neutral identity, runtime data parity, and authorization evidence |
| Financial E2E | BLOCKED | Depends on runtime/data parity and authorization evidence |
| Canonical production artifact parity | NOT PROVEN | Requires same-contract PR/build/production evidence after the provider-neutral boundary is operational |
| Final Security Certification | BLOCKED | P0/P1 evidence incomplete |
| Go-Live Certification | BLOCKED | Required gates not yet all proven |

## Verified findings driving controlled repair

### P0 — Provider-neutral authentication/runtime dependency

Production Browser E2E proved that the current Admin authentication path still calls the Supabase `staff-login` Edge Function and Supabase Realtime. The provider responds with HTTP 402, causing CORS failure and preventing the Admin shell from activating. The correct root cause is therefore a remaining runtime dependency on Supabase, not a Browser E2E defect. Tests remain fail-closed and are not bypassed.

### P0 — Runtime data parity

The provider-neutral runtime is database-reachable and the latest health endpoint verified the required clinical tables are present in Neon, but authoritative data parity has not yet been proven by a fresh controlled restore/reconciliation execution.

### P1 — Public Booking transaction correctness

The public booking transaction contained an `update_existing` CTE that was not referenced by the patient-selection path. The controlled repair now makes `target_patient` consume `update_existing`, ensuring an existing patient's supplied profile fields are actually enriched before the booking is inserted.

### P1 — Security architecture drift

The live Supabase database currently exposes `public.clinic_frontdesk_checkin(uuid,text)` as `SECURITY DEFINER` and executable by `authenticated`. Repository migrations previously moved sensitive implementation behind a private schema with an invoker wrapper, while a later migration intentionally reasserted authenticated execution. This is therefore treated as architectural drift requiring reconciliation with the intended authorization contract, not as a blind revoke operation.

### P1 — Auth leaked-password protection

Supabase Security Advisor reports leaked-password protection disabled. This remains a security finding and is not converted into a paid-plan requirement.

### P2 — Public media rendering

The latest Browser E2E also observed zero rendered images on the local canonical build for the public media test. This remains explicitly deferred because P0/P1 runtime and identity blockers must be resolved first.

## Exit criteria for this baseline

This baseline may advance toward certification only when fresh evidence proves:

1. authoritative Neon data parity;
2. runtime-critical schema/function parity;
3. provider-neutral identity/session boundary operationally replaces Supabase runtime authentication;
4. Public Booking targeted behavior and Browser E2E;
5. production build/runtime parity;
6. clinical authorization E2E;
7. final security/RLS/RPC/Auth/Storage/AI checks;
8. production smoke and browser evidence on the certified artifact.

Until then the state is **NOT PROVEN**, not Certified.
