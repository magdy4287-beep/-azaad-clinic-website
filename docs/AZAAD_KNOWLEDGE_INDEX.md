# AZAAD Knowledge Index

This is the progressive-disclosure map for agents and engineers. `AGENTS.md` stays short; this index routes to the authoritative artifact instead of duplicating rules.

## Start here

1. `AGENTS.md` — short routing map and non-negotiable architecture rules.
2. `docs/AZAAD_AGENT_ENGINEERING_HARNESS.md` — agent-first operating model, evidence discipline, entropy control, and bounded self-healing.
3. `docs/ARCHITECTURE.md` — canonical runtime/data/auth boundaries.
4. `docs/AZAAD_ROOT_SCAN_POLICY.md` — root-scan and zero-residue policy.
5. `AZAAD_MASTER_EXECUTION_PLAN.md` — current go-live execution tree.

## Architecture / ownership

- `docs/AZAAD_ARCHITECTURE_HYGIENE.md` — structural hygiene and drift controls.
- `docs/AZAAD_WORKFLOW_OWNERSHIP_REGISTRY.md` — executable workflow ownership.
- `qa/vercel-build.py` — canonical production transform/verification order.
- `qa/zero-supabase-residue-gate.py` — fail-closed retired-provider residue gate.

## Verification

- `qa/engineering-tree-garbage-collection-gate.py` — transform/verification ownership uniqueness.
- `qa/repository-architecture-gate.py` — repository architecture constraints.
- `qa/admin-domain-ownership-matrix.py` — admin domain ownership.
- `qa/admin-backend-boundary-gate.py` — canonical admin backend boundary.
- `qa/appwrite-admin-auth-boundary-gate.py` — Appwrite identity/session boundary.
- `qa/production-smoke-gate.py` — canonical source smoke checks.
- `.github/workflows/azaad-source-canonicality-gate.yml` — prevents build-time source mutation from becoming an architectural dependency.

## Current incident knowledge

- `docs/incidents/2026-09-12-neon-runtime-credential-drift.md` — production Neon credential/target drift evidence and remediation contract.

## Domain source of truth

Prefer the domain owner and its gate over similarly named historical modules. Before adding a new file, search this index, the architecture map, and the ownership gates. If an existing owner can safely be extended, do not create a second owner.

## Status language

- **PASS** — fresh executable evidence exists for the exact candidate SHA.
- **NOT PROVEN** — no fresh evidence or only historical evidence exists.
- **BLOCKED** — a required gate failed or a prerequisite is missing.
- **RETIRED** — intentionally removed; no runtime or release dependency may remain.

Never turn `NOT PROVEN` into `PASS` by inference.
