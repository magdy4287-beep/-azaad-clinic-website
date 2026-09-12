# AZAAD Architecture Hygiene & Self-Repair Contract

## Purpose

Keep AZAAD free of duplicate runtime owners, source-mutating CI, legacy deployment paths, and silent architecture drift.

## Canonical production path

GitHub → Vercel → Appwrite (identity) + Neon (data).

Supabase is not a runtime dependency.

## Ownership rules

- One canonical owner per runtime boundary.
- UI may delegate; it must not create a second backend owner.
- CI may verify or build artifacts; it must not mutate Git history.
- Production deployment ownership remains Vercel.
- Legacy deployment references are treated as failures until explicitly retired.

## Self-repair model

AZAAD uses **fail-closed deterministic self-repair guards**, not unsupervised AI edits:

1. Detect architecture drift.
2. Identify the exact file and boundary.
3. Stop the pipeline before deployment.
4. Repair the canonical owner only.
5. Run the relevant regression gates.
6. Verify the exact commit/artifact relationship.

An autonomous agent may propose or implement a minimal fix in a controlled branch, but it must never bypass a failing security, authorization, data-integrity, or exact-artifact gate.

## Cleanup policy

A legacy file/workflow is deleted only after proving:

- no active runtime imports it;
- no canonical workflow requires it;
- no production artifact references it;
- no certification contract depends on it;
- its deletion does not create a second hidden fallback.

This prevents cleanup from becoming destructive refactoring.

## Free-first rule

Do not solve architecture problems by adding paid infrastructure, increasing quotas, or creating duplicate hosted runtimes. Prefer simplification, consolidation, deterministic CI, and the existing Appwrite + Neon + Vercel architecture.
