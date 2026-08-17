# AZAAD — Controlled Evolution & Feature Delivery Plan

**AI-First • Free-Only • Safety-Gated • Evidence-Driven**

Status: **ACTIVE / CHANGE-GATED**  
Base certification layer: `AZAAD_PRODUCTION_CERTIFICATION_CONTINUOUS_OPERATIONS_PLAN.md`

## 1. Purpose

This plan governs all feature development after the production certification baseline. It prevents feature growth from bypassing the existing engineering, security, clinical, financial, AI, UAT, release, and operations controls.

## 2. Permanent Project Constraints

- AZAAD remains 100% free-only.
- AI is a platform capability across applicable clinic surfaces, including the Patient Dashboard.
- AI is assistive and never replaces authorized human decisions.
- AI cannot approve refunds, execute consequential financial actions outside authorized flows, grant privileges, bypass RLS, impersonate users, or make the final clinical decision.
- Every AI-dependent workflow must have a safe free/native/deterministic/manual fallback.
- No paid dependency may be introduced to close a gate.
- Missing evidence is `NOT PROVEN`, not PASS.

## 3. Feature Lifecycle

Every feature follows:

`Idea → Scope → Risk Classification → Contract → Bounded Implementation → Tests → UAT → Security/Authorization → AI/Fallback Review → Production Verification → Evidence → Release → Operations`

No feature skips a stage because it appears small.

## 4. Scope Before Code

For every feature define:

- user roles
- affected screens/modules
- authoritative data touched
- APIs/RPCs/Edge Functions touched
- AI involvement
- financial impact
- clinical impact
- patient-data exposure
- authorization boundary
- negative paths
- fallback behavior
- rollback strategy
- acceptance criteria

## 5. Risk Classification

### Low

UI-only or non-authoritative presentation changes with no security, clinical, financial, patient-data, or AI behavior impact.

### Medium

Changes to workflows, APIs, permissions, scheduling, patient-facing behavior, AI assistance, or operational logic.

### High

Changes involving clinical records, financial transactions/refunds, authentication/authorization, RLS, privileged actions, sensitive patient data, or consequential AI behavior.

High-risk changes require explicit evidence for the affected control domains before release.

## 6. AI Feature Contract

Every AI feature must document:

`Input → Authorization → Bounded Context → Model/Provider → Validation → Output → Human Boundary → Fallback → Audit`

Required failure tests:

- provider unavailable
- timeout
- malformed output
- quota/rate limitation where observable
- unauthorized invocation
- prompt/instruction injection attempt
- attempted privilege escalation
- attempted consequential action

AI must fail safely and leave authoritative records unchanged unless the normal authorized workflow explicitly permits the action.

## 7. Financial Feature Contract

Any financial feature must preserve:

`Request → Authorization → Required Human Approval(s) → Execution → Audit`

Refunds remain governed by:

`Refund Request → Doctor Approval → Management/Owner Approval → Execution`

This includes Cash → Cash and all other supported methods.

AI cannot approve or impersonate an approver.

## 8. Clinical Feature Contract

Clinical changes must preserve:

- patient isolation
- doctor scope
- clinical lifecycle
- correction/history controls
- auditability
- human clinical authority
- safe AI assistance/fallback

No AI output becomes a final clinical decision without the required human workflow.

## 9. Security Contract

Every changed authorization boundary must test:

- unauthenticated access
- wrong-role access
- cross-patient access
- IDOR-style identifiers
- privilege escalation
- direct endpoint/RPC access
- RLS enforcement
- session expiration
- sensitive error leakage

## 10. UAT Contract

### Reception

`Search/Register → Patient 360 → Schedule → Check-in → Payment → Receipt`

### Doctor

`Queue → Patient → Clinical Workspace → Assessment → Diagnosis/Plan → Complete Visit`

### Management/Owner

`Dashboard → Financials → Refund Request → Doctor Approval → Management/Owner Approval → Execution → Audit`

### Patient

`Authentication → Patient Dashboard → Appointments/Relevant Information → AI Assistance/Fallback → Logout`

### Negative paths

Unauthorized access, invalid state transitions, duplicate transactions, unsafe AI actions, expired sessions, and direct financial bypasses must be rejected.

## 11. Release Gate

A feature is release-ready only when:

- acceptance criteria pass
- affected tests pass
- required UAT passes
- authorization/security evidence passes
- AI/fallback evidence passes where applicable
- financial/clinical evidence passes where applicable
- production verification passes
- exact commit is known
- rollback is understood
- no paid dependency is required

## 12. Change Freeze

After release certification, the certified commit is frozen. Additional changes create a new release candidate and require fresh evidence.

## 13. Operations

After deployment monitor:

- authentication failures
- authorization denials
- API/Edge Function errors
- appointments
- payments/refunds
- clinical workflows
- patient-facing errors
- AI failures/fallbacks
- unusual denial/error spikes

Avoid sensitive logging.

## 14. Evidence Record

Each feature release records:

- feature ID/title
- exact commit SHA
- risk class
- affected modules
- acceptance criteria
- test results
- UAT result
- security result
- AI/fallback result
- clinical/financial result where applicable
- production browser/smoke result
- known limitations
- rollback plan

Missing required evidence = `NOT PROVEN`.

## 15. Definition of Done

A feature is DONE only when it is:

**Implemented + Authorized + Tested + UAT-verified + Production-verified + Evidenced + Operable + Free-only compliant.**

## 16. First Controlled-Evolution Workstream

The next implementation work should be selected from the highest-value remaining clinic workflow gap, not from cosmetic expansion.

Priority order:

1. patient safety and authorization gaps
2. clinical workflow completeness
3. financial integrity and auditability
4. scheduling/reception efficiency
5. patient dashboard completeness
6. AI assistance and fallback coverage
7. reporting/analytics
8. performance and UX refinement

Every selected workstream returns to this lifecycle before production release.
