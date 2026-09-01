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
| Provider-neutral runtime boundary | ACTIVE | Neon database boundary implemented |
| Neon runtime reachability | PASS | Vercel runtime-health reached Neon successfully |
| Neon data parity | NOT PROVEN | Controlled parity restore/verification still requires fresh execution evidence |
| Vercel build | BLOCKED / TRANSITIONING | Workflow ownership registry was missing for the newly added controlled P0 workflow; registry entry has now been added and a fresh deployment is being evaluated |
| Public Booking | NOT PROVEN | Runtime implementation exists; schema/data parity and end-to-end behavior remain gated |
| Security | BLOCKED BY OPEN FINDINGS | SECURITY DEFINER advisory requires architectural review; leaked-password protection remains disabled |
| Clinical E2E | BLOCKED | Depends on runtime/data/auth parity evidence |
| Financial E2E | BLOCKED | Depends on runtime/data parity and authorization evidence |
| Canonical production artifact parity | NOT PROVEN | Requires same-contract PR/build/production evidence |
| Final Security Certification | BLOCKED | P0/P1 evidence incomplete |
| Go-Live Certification | BLOCKED | Required gates not yet all proven |

## Verified findings driving controlled repair

### P0 — Runtime data parity

The provider-neutral runtime is database-reachable, but the authoritative clinical dataset must be proven equivalent before the new runtime can be certified. The controlled repair gate therefore restores the authoritative snapshot and reconciles clinical counts plus runtime-critical schemas/functions.

### P1 — Public Booking transaction correctness

The public booking transaction contained an `update_existing` CTE that was not referenced by the patient-selection path. The controlled repair now makes `target_patient` consume `update_existing`, ensuring an existing patient's supplied profile fields are actually enriched before the booking is inserted.

### P1 — Security architecture drift

The live Supabase database currently exposes `public.clinic_frontdesk_checkin(uuid,text)` as `SECURITY DEFINER` and executable by `authenticated`. Repository migrations previously moved sensitive implementation behind a private schema with an invoker wrapper, while a later migration intentionally reasserted authenticated execution. This is therefore treated as architectural drift requiring reconciliation with the intended authorization contract, not as a blind revoke operation.

### P1 — Auth leaked-password protection

Supabase Security Advisor reports leaked-password protection disabled. This remains a security finding and is not converted into a paid-plan requirement.

## Exit criteria for this baseline

This baseline may advance toward certification only when fresh evidence proves:

1. authoritative Neon data parity;
2. runtime-critical schema/function parity;
3. Public Booking targeted behavior and Browser E2E;
4. production build/runtime parity;
5. clinical authorization E2E;
6. final security/RLS/RPC/Auth/Storage/AI checks;
7. production smoke and browser evidence on the certified artifact.

Until then the state is **NOT PROVEN**, not Certified.
