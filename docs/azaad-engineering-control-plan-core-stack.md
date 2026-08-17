# AZAAD Engineering Control Plan — Core Stack & Production Gates

## Purpose

Keep Azaad Clinic production-safe by requiring evidence before a phase is considered complete. The control plane covers database security, authorization, financial controls, clinical workflow integrity, performance, CI, and deployment readiness.

## Core Stack

- Frontend: existing Azaad Clinic web application.
- Database/Auth: Supabase PostgreSQL + Supabase Auth.
- Hosting: Vercel.
- Source control/CI: GitHub + GitHub Actions.
- Authorization: authenticated staff + role/permission checks + PostgreSQL RLS + server-enforced RPC boundaries.
- Auditability: `clinic_audit_log` and `clinic_security_events`.

## Production Gates

### Gate 1 — Database integrity

- All required production tables exist.
- Foreign keys and check constraints are present for core patient, appointment, clinical, invoice, payment, and refund flows.
- No destructive schema change is accepted without a migration.

### Gate 2 — RLS and authorization

- Every RLS-enabled public table has an intentional policy posture.
- Anonymous access is denied unless a feature is explicitly public.
- Sensitive clinical/financial/admin data is protected by RLS and/or server-side boundaries.
- Security-definer functions use an explicit `search_path` and contain application authorization checks where authenticated execution is intentional.
- Internal trigger/helper functions remain restricted to `service_role`/database execution.

### Gate 3 — Financial controls

- Payments cannot exceed invoice balance.
- Bank-transfer verification remains server-enforced.
- Refund processing requires completed Doctor approval and Management/Owner approval.
- Requester and approver separation remains enforced.
- Cash → Cash refunds are subject to the same approval chain as every other refund method.
- AI cannot approve, process, or bypass a refund approval.

### Gate 4 — Clinical workflow

- Check-in is role controlled and records actor/time.
- Clinical visit start is scoped to the assigned doctor.
- Clinical records remain protected by RLS.
- Assessment sessions/answers/safety flags require authorized clinical staff.

### Gate 5 — Performance

- Foreign keys used by production joins have covering indexes where justified.
- RLS policies are monitored for per-row auth evaluation and multiple permissive policies.
- Unused-index findings are treated as optimization candidates, not automatic deletion work.

### Gate 6 — CI and deployment

- Security contract checks are present in GitHub Actions.
- Required regression/browser checks must remain green before production completion.
- Vercel production deployment must correspond to the verified `main` state.
- A deployment is not considered complete from a commit alone; deployment evidence is required.

### Gate 7 — External platform settings

- Supabase Auth settings that cannot be verified through the database must be verified in the Supabase dashboard before final production sign-off.
- Current known external setting requiring dashboard verification: leaked-password protection.

## Definition of Done

A production phase is complete only when the implementation exists, the relevant gate has fresh evidence, regressions are checked, and any remaining item is explicitly classified as either a real blocker or a non-blocking optimization.

## Current Evidence Baseline — 2026-08-17

- Supabase production project is healthy.
- Core Patient 360, scheduling, check-in, clinical assessment, billing/payment, refund, audit, workflow, and AI tables are present.
- RLS is enabled across the public application tables inspected.
- All inspected security-definer functions have explicit `search_path` configuration.
- Internal security-definer helpers are restricted to database/service-role execution; authenticated execution is limited to intentional application RPCs with role/permission checks.
- RLS policy coverage exists for the inspected RLS-enabled public tables.
- Five missing foreign-key covering indexes identified by the performance advisor were added in migration `azaad_core_stack_performance_fk_indexes`.
- Remaining performance-advisor warnings are optimization items unless they affect a production SLO.
- Supabase Auth leaked-password protection still requires dashboard-level verification.
