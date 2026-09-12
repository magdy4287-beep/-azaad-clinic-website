# AZAAD — Controlled Evolution Certification Baseline

> **Historical certification snapshot — frozen evidence, not the current production state.**
>
> Snapshot date: **2026-09-02**. This document preserves the evidence and blockers recorded at that point in the controlled-evolution process. It must not be used as the source of truth for the current production architecture, current runtime status, or current release state.
>
> **Current production architecture:** Vercel runtime + Appwrite identity/session boundary + Neon data boundary. Supabase is legacy migration/rollback/DR evidence only and is not a production runtime owner.
>
> **Governance rule:** New production work must follow the current canonical architecture and current certification/go-live evidence. Historical findings in this snapshot must not be treated as open findings unless independently re-proven by a fresh root scan.

**Status:** HISTORICAL / FROZEN EVIDENCE

## Purpose

This document freezes the controlled-evolution verification boundary after Emergency DR closure. It does not reopen, repeat, or modify the Emergency DR process. Its purpose is archival traceability for the 2026-09-02 certification snapshot.

## Historical certification baseline contract

- Supabase was recorded as the rollback/reference source for this historical snapshot.
- Emergency DR was recorded as closed and must not be re-entered for controlled evolution.
- No production cutover was authorized by this historical document.
- No uncontrolled production mutation was authorized.
- Every repair was bounded, exact-commit evidenced, and fail-closed.
- P2/P3 work remained blocked while P0/P1 findings remained unresolved at the snapshot date.
- Free-Only remained mandatory.
- Neon parity verification in that phase was strictly read-only; no restore, migration, dump replay, or target mutation was permitted.

## Historical gate snapshot — 2026-09-02

| Gate | State at snapshot | Evidence / blocker recorded at snapshot |
|---|---|---|
| Emergency DR | CLOSED | Historical DR gate remained closed; no reopening required |
| Certification baseline | PINNED | Immutable branch `certification/baseline-2026-09-02-558f3663` pointed to `main` SHA `558f3663a4dfaf78b07c916eea24e3050bf0029b` |
| Provider-neutral runtime boundary | ACTIVE | Neon database boundary implemented; Supabase runtime explicitly forbidden on the controlled branch |
| Neon runtime reachability | PASS | Latest controlled Vercel runtime-health reached a Neon database and verified its required runtime tables |
| Neon data parity | P0 BLOCKED | Read-only reconciliation proved the GitHub Actions `NEON_DATABASE_URL` target was not the same data target represented by the Vercel runtime at the snapshot date. CI target fingerprint: `69b433b6f1a939f6f37e810606eae1f8345547c43cf83cf524dbf48aa18a05f7`; Vercel runtime fingerprint: `efcfb7176b16b62192ca9d8e15515d8fd20e5fc670704f271305eee62ef6e410`. No mutation was performed. |
| Vercel build | PASS | Latest controlled deployment reached READY; build logs completed without build errors |
| Production artifact parity | P0 BLOCKED | Production alias resolved to an older deployment than the recorded `main` baseline at the snapshot date. No production cutover was authorized until the certified artifact was ready. |
| Provider-neutral runtime health | BLOCKED | The controlled Vercel runtime was recorded as missing Appwrite endpoint/project/API-key configuration and explicit Appwrite identity-provider configuration at the snapshot date |
| Authentication | P0 BLOCKED | The historical Admin authentication path was recorded as depending on Supabase staff-login/Realtime and receiving HTTP 402 under the provider limit. This is historical evidence only and must not be treated as proof of the current runtime state. |
| Public Booking | NOT PROVEN | Provider-neutral runtime implementation existed; schema/data parity and targeted end-to-end behavior remained gated at the snapshot date |
| Security | BLOCKED BY OPEN FINDINGS | SECURITY DEFINER advisory required architectural review; leaked-password protection was recorded as disabled |
| Clinical E2E | BLOCKED | Depended on provider-neutral identity, runtime data parity, and authorization evidence at the snapshot date |
| Financial E2E | BLOCKED | Depended on runtime/data parity and authorization evidence at the snapshot date |
| Canonical production artifact parity | NOT PROVEN | Required same-contract PR/build/production evidence after the provider-neutral boundary was operational |
| Final Security Certification | BLOCKED | P0/P1 evidence was incomplete at the snapshot date |
| Go-Live Certification | BLOCKED | Required gates were not all proven at the snapshot date |

## Historical Production Health Audit — 2026-09-02

The audit was performed read-only across GitHub, Vercel, and the rollback/reference Supabase project. The sections below preserve that evidence exactly as a historical record; they are not a live status report.

### Positive evidence recorded at the time

- Current `main` was healthy enough for the repository Operations Health workflow: latest main run `33594696908` completed successfully and its production Vercel health check passed.
- Current Vercel runtime error aggregation reported no runtime errors in the preceding 24 hours.
- The controlled PR head `720b26b527ebde65049eb25c4d52c306ba4ca8ff` had successful Vercel deployment status and the security regression gate passed.
- Supabase project status was `ACTIVE_HEALTHY`.
- Supabase Auth logs showed successful controlled authentication activity; this did not prove the production Admin path was provider-neutral.

### Critical artifact finding recorded at the time

The production alias was not serving the then-current `main` SHA. The production deployment metadata identified `b61a31a9b4e360ba75dce972f9a44eac10967a57`, while `main` was `558f3663a4dfaf78b07c916eea24e3050bf0029b`. A direct Git comparison showed `main` was 11 commits ahead of the production SHA. This was classified as a P0 release-boundary defect for that snapshot.

The repository's canonical Browser E2E workflow already contained a fail-closed wait for `<meta name="azaad-build-sha">` to equal the exact GitHub SHA before production browser execution. The recorded repair direction was to restore artifact/deployment alignment under controlled release governance, not to weaken or bypass the check.

## Historical findings driving controlled repair at the snapshot date

### P0 — Provider-neutral authentication/runtime dependency

Production Browser E2E evidence established that the then-current Admin authentication path still called the Supabase `staff-login` Edge Function and Supabase Realtime. The provider responded with HTTP 402, causing CORS failure and preventing the Admin shell from activating. The recorded root cause was therefore a remaining runtime dependency on Supabase, not a Browser E2E defect. Tests remained fail-closed and were not bypassed.

### P0 — Authoritative Neon target mismatch

The read-only parity gate established a critical environment-boundary defect at the snapshot date: the database referenced by the GitHub Actions `NEON_DATABASE_URL` secret was not the database represented by the Vercel runtime. The recorded evidence was independently consistent: GitHub Actions connected to `neondb|neondb_owner` with target fingerprint `69b433b6f1a939f6f37e810606eae1f8345547c43cf83cf524dbf48aa18a05f7`, while Vercel runtime-health connected to a different target with fingerprint `efcfb7176b16b62192ca9d8e15515d8fd20e5fc670704f271305eee62ef6e410` and reported the required runtime tables present. No mutation was authorized by that historical baseline.

### P0 — Production artifact drift

The production alias pointed to an older `main` ancestor rather than the snapshot baseline SHA. This was to be corrected only through the normal controlled release path after the recorded P0/P1 runtime and identity blockers were closed.

### P0 — Provider runtime configuration

The controlled Vercel runtime was recorded as fail-closed because the Appwrite endpoint/project/API-key and explicit Appwrite identity-provider configuration were not present at that time. The recorded runtime contract required Appwrite explicitly.

### P1 — Public Booking transaction correctness

The public booking transaction contained an `update_existing` CTE that was not referenced by the patient-selection path. The controlled repair recorded in this snapshot made `target_patient` consume `update_existing`, ensuring an existing patient's supplied profile fields were enriched before the booking was inserted.

### P1 — Security architecture drift

The live Supabase database was recorded as exposing `public.clinic_frontdesk_checkin(uuid,text)` as `SECURITY DEFINER` and executable by `authenticated`. Repository migrations had previously moved sensitive implementation behind a private schema with an invoker wrapper, while a later migration intentionally reasserted authenticated execution. This was therefore treated as architectural drift requiring reconciliation with the intended authorization contract, not as a blind revoke operation.

### P1 — Auth leaked-password protection

Supabase Security Advisor reported leaked-password protection disabled at the snapshot date. This remained a security finding and was not converted into a paid-plan requirement.

### P2 — Public media rendering

The latest Browser E2E observed zero rendered images on the local canonical build for the public media test. This was explicitly deferred because P0/P1 runtime and identity blockers had priority at the snapshot date.

## Process corrections recorded in this historical phase

- Emergency restore implementations were removed from the controlled-evolution diff; the closed DR scripts were no longer modified by PR #94.
- The Neon parity gate was converted from a stateful restore workflow to a strictly read-only reconciliation workflow.
- The provider-readiness workflow shell-expansion defect in the bcrypt query was fixed.
- The runtime contract was changed to require Appwrite explicitly rather than accepting an arbitrary non-Supabase provider.
- Runtime-health emitted a non-secret database-target fingerprint so environment drift could be diagnosed without exposing connection credentials.
- The runtime evidence confirmed the fingerprint mismatch directly; no inference from row counts alone was used for the environment-boundary diagnosis.
- Production artifact drift was explicitly classified as P0; exact-SHA Browser E2E remained fail-closed.

## Historical exit criteria

This historical baseline was allowed to advance toward certification only when fresh evidence proved:

1. the existing authoritative Neon target was the same target used by Vercel;
2. authoritative Neon data parity through read-only reconciliation;
3. runtime-critical schema/function parity;
4. provider-neutral identity/session boundary operationally replaced Supabase runtime authentication;
5. the production deployment artifact exactly matched the certified GitHub SHA;
6. Public Booking targeted behavior and Browser E2E;
7. production build/runtime parity;
8. clinical authorization E2E;
9. final security/RLS/RPC/Auth/Storage/AI checks;
10. production smoke and browser evidence on the certified artifact.

These criteria describe the **2026-09-02 historical certification gate**. They are not a substitute for the current Go-Live plan or fresh evidence. Any item that still matters must be independently re-proven by the current root scan before being treated as an active blocker.
