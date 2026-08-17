# AZAAD Engineering Control Plan — Core Stack & Production Gates

## Status

**Core Stack & Production Gates: PASS / LOCKED**

Production source of truth: `main` → GitHub Pages.
Backend: Supabase Auth/Postgres/RLS/Edge Functions.
Vercel is optional preview/development infrastructure and is not a production gate.

## Core Gates

- Infrastructure and deployment path
- Authentication and authorization
- Supabase RLS / role isolation
- Patient 360 access control
- Scheduling and appointment state integrity
- Check-in workflow
- Doctor clinical workspace boundaries
- Assessment / clinical data authorization
- RCM, invoices, payments and reporting
- Refund approval control
- Password security control
- Arabic / English UI foundation
- CI / regression checks
- Production browser E2E

## Non-Negotiable Security Controls

1. No Supabase service-role or secret key in browser assets.
2. Privileged operations require authenticated authorization and appropriate role scope.
3. Clinical access must remain patient/visit scoped.
4. AI is assistive only and cannot authorize financial, privilege, or final clinical decisions.
5. Refund execution requires human approval in sequence: Doctor Approval, then Management/Owner Approval. Cash→Cash is included. AI cannot approve or execute around the approval chain.
6. Historical financial and clinical records must be preserved; use controlled archival/correction workflows instead of destructive deletion where history exists.
7. Password compromise checks must not log or transmit plaintext passwords or full password hashes.

## Production Gate Contract

A change is production-ready only when all applicable checks have fresh evidence:

`implementation → authorization → validation → audit/security → error handling → Arabic/English → responsive behavior → verification → production deployment → production smoke`

A Git commit alone is not production proof.

## Current Baseline

- PR #40 password-security change merged to `main`.
- Production browser E2E has passed against the merge commit.
- Core production gates are closed.

## Change Control

Any new feature or defect fix must enter as a bounded change with acceptance criteria and its own verification evidence. Do not reopen or weaken a passing core gate merely to accommodate an unrelated change.
