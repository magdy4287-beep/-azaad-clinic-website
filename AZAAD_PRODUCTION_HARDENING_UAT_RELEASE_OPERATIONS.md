# AZAAD Production Hardening → UAT → Release Governance → Operations

Status: **ADOPTED / ACTIVE**

Effective branch: `main`
Production source of truth: `main` → GitHub Pages.
Backend: Supabase Auth/Postgres/RLS/Edge Functions.
Vercel: optional preview/development infrastructure unless explicitly promoted by a future release decision.

## 1. Production Hardening Gate

Every production change must be evaluated for:

- authentication/session integrity
- RBAC and privilege boundaries
- Supabase RLS and server-side authorization
- IDOR/cross-patient access
- secret exposure and browser trust
- unsafe client-side authorization
- XSS/injection and unsafe redirects
- rate limiting and abuse resistance where applicable
- auditability of sensitive actions
- financial integrity
- clinical-data integrity
- AI safety boundaries
- error and information leakage
- Arabic/English and RTL/LTR behavior
- responsive behavior

Severity policy:

- Critical: release blocker; contain and fix before release.
- High: release blocker unless explicitly risk-accepted by authorized human owner with evidence.
- Medium: may release only with documented owner and follow-up date.
- Low: backlog unless it affects a production gate.

## 2. Financial Safety Gate

Refunds are never executed directly from a client or AI action.

Required sequence:

`Refund Request → Doctor Approval → Management/Owner Approval → Refund Execution`

This applies to every original payment method and refund method, including Cash → Cash.

AI cannot approve, impersonate, bypass, or execute around this chain.

Other financial invariants:

- completed financial records are not destructively edited
- corrections use controlled workflows
- duplicate financial transactions are rejected
- sensitive financial actions are attributable to an authenticated actor
- approval history is preserved

## 3. Clinical Safety Gate

Clinical access must remain authorized and scoped.

- no cross-patient access
- no privilege escalation through the browser
- clinical changes require appropriate authenticated role scope
- historical clinical records are preserved through controlled correction/archive workflows
- AI is assistive only and cannot make the final clinical decision

## 4. UAT Contract

UAT must cover complete workflows, not isolated buttons.

### Reception

`Search/Register → Patient 360 → Schedule → Check-in → Payment → Receipt`

### Doctor

`Queue → Patient → Clinical Workspace → Assessment → Diagnosis/Plan → Complete Visit`

### Management/Owner

`Dashboard → Financials → Refund Request → Doctor Approval → Management/Owner Approval → Execution → Audit`

### Administration

`Users → Roles → Permissions → Audit → Configuration`

### Negative UAT

The following must be rejected:

- unauthorized patient access
- unauthorized clinical access
- unauthorized financial action
- direct refund execution without both approvals
- AI financial approval
- AI privilege escalation
- duplicate payment/refund
- invalid appointment state transition
- expired/invalid session access

## 5. Release Governance

No production change is considered ready from a Git commit alone.

Required sequence:

`Requirement → bounded change → implementation → authorization checks → validation → audit/security → errors → Arabic/English → responsive → verification → production deployment → production smoke → evidence`

Every change must identify:

- acceptance criteria
- affected modules
- security impact
- data/financial impact
- rollback strategy
- verification evidence

A passing Core Gate must not be weakened to accommodate an unrelated change.

### Executable governance enforcement

`.github/workflows/azaad-release-governance-gate.yml` enforces this document on `main` and pull requests targeting `main`.

The gate verifies that:

- this policy is present and contains the critical financial, release, and evidence rules
- one-time/once workflows cannot acquire automatic `push`, `schedule`, `pull_request`, or `pull_request_target` triggers
- one-time/once workflows cannot silently introduce `secrets` or `environment` blocks

One-time workflows that have completed their migration remain manually dispatched only. They must never become part of the normal production release path.

## 6. Required Production Evidence

A release is certified only when the applicable evidence exists for the exact production commit:

- CI/regression result
- security/authorization result
- relevant UAT result
- production deployment result
- production browser/smoke result
- audit/financial evidence when applicable

If evidence is missing, status is **NOT PROVEN**, not PASS.

## 7. Operations

Production incidents follow:

`Detect → Triage → Contain → Investigate → Correct → Verify → Deploy → Monitor → Postmortem`

Priority:

- P0: patient-data exposure, security breach, financial corruption, or catastrophic production failure.
- P1: major production workflow unavailable or materially unsafe.
- P2: significant degradation with workaround.
- P3: minor defect or cosmetic issue.

For P0/P1, protect evidence first and preserve audit/database history. Do not perform destructive emergency edits that erase the forensic trail.

## 8. Backup / Recovery

Before operational certification, maintain and periodically test:

- database backup availability
- restore procedure
- data-integrity validation after restore
- application recovery procedure
- ownership and escalation contacts
- documented recovery objectives (RPO/RTO)

A backup that has never been restored is not considered proven recovery capability.

## 9. Observability

Monitor at minimum:

- authentication failures
- authorization/RLS denials
- application/API failures
- Edge Function failures
- payment/refund failures
- appointment failures
- frontend/browser errors
- unusual access-denial spikes

Sensitive logs must not contain plaintext passwords, secrets, or unnecessary patient data.

## 10. Change Freeze Rule

Once a release passes all applicable gates, do not continue changing unrelated code under the same release candidate. New work becomes a new bounded change and must obtain fresh evidence.

## 11. Current Adoption

The Core Stack & Production Gates remain **PASS / LOCKED** under `AZAAD_ENGINEERING_CONTROL_PLAN.md`.

This document activates the next operating layer:

**Production Hardening → UAT → Release Governance → Operations**

The layer is active, and its governance rules are now executable through CI. Individual release gates remain evidence-based and must not be marked PASS without fresh evidence.
