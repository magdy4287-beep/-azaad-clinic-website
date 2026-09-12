# AZAAD — Agent Engineering Operating Contract

## Purpose

This repository is operated as a long-running engineering system. Future agents must continue from verified state, select only the context needed for the current task, inspect the root cause before changing code, and verify the exact resulting artifact.

## Operating loop

1. **Select context:** current SHA, canonical build graph, relevant runtime owner, current production deployment, and the latest failing evidence.
2. **Map ownership:** every production capability has one runtime owner, one backend boundary, one permission boundary, one data owner, and one verification contract.
3. **Trace the root:** follow the execution path from HTML entrypoint → script graph → transform → API boundary → identity → Neon data → audit.
4. **Parallelize independent work:** inspect CI/workflow ownership, runtime ownership, backend boundaries, and production telemetry independently when they do not mutate the same file.
5. **Change the canonical owner:** do not patch a generated artifact when the source transform owns it; do not add a second endpoint when an existing consolidated boundary can safely own the resource.
6. **Fail closed:** duplicate owners, retired runtime markers, browser credentials, hidden legacy providers, ambiguous transform ordering, and stale certification pointers are build/review failures.
7. **Verify proportionally:** rerun the smallest meaningful gate first; broaden to exact-SHA Browser E2E only after new failures or architecture changes justify it.
8. **Promote only with evidence:** production SHA, build provenance SHA, Browser E2E SHA, and certification SHA must match before Go-Live is declared.

## Parallel work discipline

Independent read-only investigations may run concurrently. Mutations are serialized per file and per ownership boundary. Never make two competing edits to the same canonical file in parallel, and never let one workstream silently redefine another workstream's owner.

Every workstream must leave a compact evidence record: `scope → finding → owner → action/no-action → verification → next dependency`.

## Root-scan and deduplication policy

At the start of every meaningful task, scan for:

- duplicate runtime/API entrypoints;
- duplicate workflow ownership;
- stale deployment paths;
- stale release-candidate SHA/PR references;
- legacy provider references that can enter the production runtime;
- generated artifacts that are being treated as source-of-truth;
- duplicate or contradictory engineering plans.

Do not delete historical evidence merely because it is old. Historical evidence remains under its historical/evidence role. Instead, make exactly one document authoritative for the current state and convert stale active pointers into historical references. Deletion is allowed only when a duplicate has no evidence, ownership, rollback, or audit value and a repository gate proves it is unused.

## Self-healing policy

Self-healing means deterministic detection and bounded repair of known failure classes. It does not mean allowing an AI runtime to modify production silently.

Known repair classes:

- duplicate script/runtime owner → canonical dedupe transform + fail-closed gate
- retired Supabase/browser session marker → provider-boundary transform + drift gate
- conflicting transform ownership → ownership registry + transform-order assertion
- missing backend boundary → reuse an existing consolidated API boundary where possible
- wrong production artifact → exact commit provenance + production Browser E2E
- stale workflow → workflow ownership registry + retired-workflow gate
- stale certification pointer → canonical release-state document + certification-state gate
- known platform configuration failure → detect from production telemetry and route repair to the owning platform boundary; never hardcode secrets or introduce a fallback runtime provider

Any new failure must first become a reproducible gate before it becomes an automatic repair rule.

## AI operating rule

AI may investigate, propose, implement bounded repository changes, and verify them. AI must not silently alter production infrastructure, credentials, security policy, clinical authorization, financial controls, or data-retention behavior. High-risk changes require explicit evidence and the repository's normal review gates.

## Free-forever rule

Production clinic operation must not require paid AI, paid SaaS, or a quota-dependent AI runtime. AI remains advisory and human-approved. Core identity, scheduling, patient data, clinical data, invoicing, audit, and authorization must remain deterministic and operational without AI availability.

## Evidence discipline

Never transfer a successful result from an older SHA to a newer SHA. Every release claim must cite the exact current commit and its production artifact evidence.

## Astra-inspired collaboration pattern

The project adopts the publicly documented engineering behaviors of GPT-6 Astra: initiative and follow-through, context selection, tool orchestration, parallel delegation where useful, adapting to new evidence, and thorough verification. Astra's public guidance emphasizes multistep tool workflows, proportional reasoning effort, and verification through code/browser execution; these are adopted here as engineering workflow principles, not as a dependency on the model itself.
