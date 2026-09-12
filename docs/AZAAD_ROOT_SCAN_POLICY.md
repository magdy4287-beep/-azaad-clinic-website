# AZAAD — Root Scan Governance

## Purpose

Keep the engineering tree deterministic, current, and resistant to stale architecture, duplicate ownership, and self-reintroduced legacy runtime dependencies.

## Canonical runtime boundary

- **Vercel:** production deployment/runtime owner.
- **Appwrite:** canonical identity and session boundary.
- **Neon:** canonical production data boundary.
- **Supabase:** migration, rollback, DR, and historical evidence only; never a production runtime owner.

## Root-scan rules

Every material engineering task starts from the current `main` tree and follows this order:

1. Read the current architecture/go-live source of truth.
2. Identify the last verified commit and do not repeat already-proven gates without a new reason.
3. Scan for stale ownership language, duplicate runtime/data owners, dead executable paths, test bypasses, secret exposure, and contradictory documentation.
4. Classify each finding as **active**, **historical evidence**, **duplicate**, or **false positive** before changing anything.
5. Fix the smallest safe root cause; do not repair symptoms in multiple layers when one owner can be made canonical.
6. Verify the changed boundary with the narrowest meaningful fresh evidence, then broaden verification only when the change warrants it.
7. Record the new canonical owner and the evidence needed for future scans.
8. Re-scan the affected boundary after the repair so the same finding cannot immediately reappear.

## Duplicate-control rules

- One production runtime owner per domain.
- One canonical data owner per domain.
- One backend boundary per production API/domain.
- One permission boundary per protected operation.
- One E2E contract per production workflow.
- Historical providers and snapshots must be explicitly labeled historical and must not be referenced as current implementation baselines.
- Do not create a second workflow, controller, service, or verification gate when an existing canonical owner can be extended safely.

## Self-healing / future-bug rules

The repository must fail closed when an architecture boundary regresses. New production APIs and workflows should expose enough machine-checkable ownership metadata for CI to detect:

- Supabase runtime imports or production endpoint references outside explicitly allowlisted migration/DR evidence.
- Missing Appwrite identity/session ownership for protected admin operations.
- Missing Neon data ownership for production data paths.
- Multiple runtime/data/backend/permission owners for the same domain.
- Browser-visible service-role credentials or other forbidden secret material.
- Exact-SHA production artifact drift.
- Tests that bypass authentication, authorization, data ownership, or production artifact checks.

A detected regression should produce a clear CI failure with the violated boundary and the expected canonical owner. Automated repair must never silently mutate production or weaken a security gate; the safe behavior is to stop, surface the root cause, and route the smallest bounded repair through normal PR/review/release governance.

## Historical-document rule

Historical certification baselines may preserve old blockers, provider names, fingerprints, counts, and deployment SHAs for auditability. They must be visibly marked as historical/frozen evidence and must state that their findings require fresh re-proving before being treated as current blockers.

## Free-forever constraint

All governance, scanning, verification, and self-healing controls must use repository-native or already-available free capabilities whenever possible. No mandatory paid SaaS, paid AI API, or paid plugin may be introduced as a production dependency.
