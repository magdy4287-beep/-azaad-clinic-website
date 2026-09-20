# AZAAD — Root Scan Governance

## Canonical engineering tree

```text
AZAAD
├── Runtime → Vercel
├── Identity / Session → Appwrite
├── Production Data → Neon
├── Protected production domains → one explicit runtime owner + data owner + backend boundary + permission boundary + E2E contract
├── Verification → GitHub Actions + exact-SHA artifact checks + targeted browser/production evidence
└── Governance → current architecture/go-live documents + this root-scan policy
```

This is a governance map, not a second implementation plan.

## Purpose

Keep the engineering tree deterministic, current, and resistant to stale architecture, duplicate ownership, dead migration scaffolding, and self-reintroduced legacy dependencies.

## Canonical runtime boundary

- **Vercel:** production deployment/runtime owner.
- **Appwrite:** canonical identity and session boundary.
- **Neon:** canonical production data boundary.
- No retired backend provider, migration directory, compatibility package, legacy endpoint, provider-specific environment variable, or provider-specific build transform is permitted in the active repository tree.

## Root-scan rules

Every material engineering task starts from the current `main` tree and follows this order:

1. Read the current architecture/go-live source of truth.
2. Identify the last verified commit and do not repeat already-proven gates without a new reason.
3. Scan for stale ownership language, duplicate runtime/data owners, dead executable paths, test bypasses, secret exposure, contradictory documentation, retired-provider residue, and build-time translation layers.
4. Classify each finding as **active**, **historical evidence**, **duplicate**, or **false positive** before changing anything.
5. Fix the smallest safe root cause; do not repair symptoms in multiple layers when one owner can be made canonical.
6. Verify the changed boundary with the narrowest meaningful fresh evidence, then broaden verification only when the change warrants it.
7. Record the new canonical owner and the evidence needed for future scans.
8. Re-scan the affected boundary after the repair so the same finding cannot immediately reappear.

## Zero-retired-provider rule

The active repository is source-of-truth, not a legacy build-input archive. The following are forbidden anywhere in the active tree:

- retired-provider directory names or path components;
- retired-provider SDK/package dependencies;
- retired-provider URLs, endpoint paths, function routes, or client constructors;
- retired-provider environment-variable names or secrets;
- retired-provider imports, runtime identifiers, browser globals, or generated compatibility code;
- retired-provider references in active documentation, QA scripts, workflows, configuration, fixtures, or deployment metadata;
- build transforms whose only purpose is to erase a retired provider from otherwise non-canonical source;
- historical snapshots copied into the active source tree.

The repository must be able to pass the zero-residue gate from source alone. Production correctness must not depend on a build step secretly converting legacy source into canonical source.

## Duplicate-control rules

- One production runtime owner per domain.
- One canonical data owner per domain.
- One backend boundary per production API/domain.
- One permission boundary per protected operation.
- One E2E contract per production workflow.
- Historical evidence belongs outside the active implementation tree.
- Do not create a second workflow, controller, service, or verification gate when an existing canonical owner can be extended safely.

## Self-healing / future-bug rules

The repository must fail closed when an architecture boundary regresses. New production APIs and workflows should expose enough machine-checkable ownership metadata for CI to detect:

- retired-provider residue or production endpoint references;
- missing Appwrite identity/session ownership for protected admin operations;
- missing Neon data ownership for production data paths;
- multiple runtime/data/backend/permission owners for the same domain;
- browser-visible service-role credentials or other forbidden secret material;
- exact-SHA production artifact drift;
- tests that bypass authentication, authorization, data ownership, or production artifact checks;
- build-time canonicalization that masks non-canonical source.

A detected regression should produce a clear CI failure with the violated boundary and the expected canonical owner. Automated repair must never silently mutate production or weaken a security gate; the safe behavior is to stop, surface the root cause, and route the smallest bounded repair through normal PR/review/release governance.

## Historical-document rule

Historical certification evidence must live outside the active implementation tree. If an immutable audit record must preserve an old provider name, fingerprint, count, blocker, or deployment SHA, keep that record in an explicitly external audit artifact rather than copying historical implementation identifiers back into active source, configuration, QA, or architecture files.

## Continuation / no-loop rule

After each merged root-scan repair, the next task starts from the resulting `main` SHA. Completed evidence is carried forward and is not re-run without a new change or an explicit release gate. Do not reopen a closed DR phase, repeat a successful historical certification run, recreate a removed backend, add a duplicate controller/service/workflow, or weaken a failing gate merely to obtain green status.

Independent investigations may proceed in parallel when the available tooling supports it, but writes to the same file, branch, runtime boundary, or database target remain serialized. Parallelism must never create competing canonical owners or unverified overlapping mutations.

## Free-forever constraint

All governance, scanning, verification, and self-healing controls must use repository-native or already-available free capabilities whenever possible. No mandatory paid SaaS, paid AI API, or paid plugin may be introduced as a production dependency.
