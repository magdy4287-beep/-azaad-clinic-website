# AZAAD Agent Map

This file is a map, not an encyclopedia. The repository is the system of record for architecture, ownership, verification, and recovery rules.

## Mission

Operate AZAAD as a free-first clinic system. Production runtime is Vercel + Appwrite identity/session boundary + Neon data boundary. The retired legacy provider tree and endpoints are not part of the architecture, migration path, DR path, or production runtime.

## Canonical engineering loop

`ROOT SCAN -> OWNERSHIP MAP -> ROOT CAUSE -> MINIMAL SAFE CHANGE -> STATIC GATES -> BUILD -> BROWSER/E2E -> EXACT SHA -> DOCUMENT -> NEXT ROOT SCAN`

Never repeat a gate that already passed unless its inputs or dependencies changed. A failure must be fixed at its owning layer, not hidden by weakening the assertion.

## Ownership map

- Browser authentication/session: `/api/admin-auth` with server-managed HttpOnly Appwrite session.
- Appointments/scheduling: `/api/admin-appointments` + `qa/finalize-schedule-center-appwrite.py`.
- Staff administration: `/api/staff-admin`.
- Finance/invoices/payments: `/api/invoices` and the canonical enterprise/RCM runtime.
- Admin shell/navigation: `admin.html` + canonical `admin.js` + admin module registry.
- Production transformation owner: `qa/vercel-build.py`.
- Production verification: `qa/*gate*.py`, architecture gates, and browser E2E.
- Retired provider artifacts: forbidden residue; they must not remain in source, workflows, transforms, tests, documentation, or reachable production artifacts.

## Change rules

1. One runtime owner per business surface.
2. One backend owner per canonical API boundary.
3. Build transforms may create the production artifact; CI must not mutate Git history, merge PRs, or silently rewrite the repository.
4. Prefer deletion/retirement of superseded owners over adding another compatibility layer.
5. Preserve fail-closed behavior for unknown roles, missing sessions, inactive staff, invalid bindings, and unexpected backend responses.
6. Never expose Appwrite API keys, service credentials, database credentials, or session secrets to the browser.
7. Do not add paid services, paid AI APIs, or mandatory subscriptions when a free-first local/server-side design satisfies the requirement.
8. Documentation must point to current canonical owners; stale instructions are treated as architectural defects.
9. The zero-residue gate is a mandatory production verification boundary; a repository containing retired-provider residue is not releaseable.

## Cleanup / self-healing policy

Self-healing is deterministic and evidence-driven: diagnostics identify the owner, root cause, and smallest safe remediation. Automatic source mutation from CI is prohibited. An agent may implement the remediation in an isolated change, run the affected gates, inspect failures, and iterate until the evidence is clean. Destructive database/provider actions require explicit human approval.

## Agent harness

Use `docs/AZAAD_KNOWLEDGE_INDEX.md` as the progressive-disclosure entrypoint. It routes to `docs/AZAAD_AGENT_ENGINEERING_HARNESS.md` and the authoritative architecture, ownership, plan, incident, and verification artifacts. Keep this file short enough to function as a routing map.

## Required evidence before Go-Live

Exact commit provenance, canonical production build, security/RBAC gates, Appwrite authorization E2E, browser E2E, backup/restore evidence for the canonical data boundary, UAT/pilot evidence, and operational runbook/training evidence must all pass. A green subset never overrides a failed certification gate.

## Repository knowledge

Read `docs/AZAAD_KNOWLEDGE_INDEX.md` first, then follow its links to `docs/ARCHITECTURE.md`, `docs/AZAAD_ARCHITECTURE_HYGIENE.md`, `docs/AZAAD_AGENT_ENGINEERING_HARNESS.md`, the active certification/operations documents, the current incident records, and the relevant domain gate before changing a runtime boundary. Prefer small, inspectable changes over broad rewrites.
