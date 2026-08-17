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

## 3. Free-Only Build Governance

Production application deployments must not consume the free Vercel build budget for documentation/control-plane-only changes.

The repository `vercel.json` uses an `ignoreCommand` based on the exact parent/child commit diff. It excludes Markdown documentation, the documentation directory, and GitHub workflow definitions from the application-impacting diff. When the application-impacting diff is empty, Vercel is instructed to skip the application build; when application files change, the build proceeds normally.

This control is intentionally free-only: **no Vercel plan upgrade is permitted to satisfy this gate**.

Important boundary:

- Documentation/control-plane-only changes are not production application releases.
- Changes to application build scripts, runtime files, configuration that affects the deployed application, or security/clinical/financial code remain deployment-impacting and must not be hidden by the ignore rule.
- The `ignoreCommand` itself is configuration that must be reviewed whenever deployment boundaries change.
- The first commit that introduces or changes the ignore rule may itself require a Vercel deployment because the deployment configuration changed; that is expected and is not evidence of a failure of the rule on later documentation-only commits.

### Build Governance Evidence — 2026-08-17

Compared against the certified production baseline `619f82b1d4fca117200e55c399f38b9cace2237e`, the current `main` branch contains four later commits whose changed files are limited to controlled-evolution documentation/evidence plus the `vercel.json` deployment-governance change. The current `vercel.json` ignore rule is therefore now present on `main` and is the mechanism for preventing future documentation-only application builds.

The earlier Vercel `FAIL — upgradeToPro=build-rate-limit` on the documentation-plan commit is recorded as a **free-tier capacity event**, not as a reason to purchase an upgrade. The certified production baseline remains unchanged.

**Governance state: IMPLEMENTED / FREE-ONLY**.

The first subsequent documentation-only commit must be observed for the expected Vercel `Skipped / Ignored Build Step` behavior. Until that observation exists, the behavior is **IMPLEMENTED but NOT PROVEN in a fresh post-configuration Vercel run**.

## 4. Feature Lifecycle

Every feature follows:

`Idea → Scope → Risk Classification → Contract → Bounded Implementation → Tests → UAT → Security/Authorization → AI/Fallback Review → Production Verification → Evidence → Release → Operations`

No feature skips a stage because it appears small.

## 5. Scope Before Code

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

## 6. Risk Classification

### Low

UI-only or non-authoritative presentation changes with no security, clinical, financial, patient-data, or AI behavior impact.

### Medium

Changes to workflows, APIs, permissions, scheduling, patient-facing behavior, AI assistance, or operational logic.

### High

Changes involving clinical records, financial transactions/refunds, authentication/authorization, RLS, privileged actions, sensitive patient data, or consequential AI behavior.

High-risk changes require explicit evidence for the affected control domains before release.

## 7. AI Feature Contract

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

## 8. Financial Feature Contract

Any financial feature must preserve:

`Request → Authorization → Required Human Approval(s) → Execution → Audit`

Refunds remain governed by:

`Refund Request → Doctor Approval → Management/Owner Approval → Execution`

This includes Cash → Cash and all other supported methods.

AI cannot approve or impersonate an approver.

## 9. Clinical Feature Contract

Clinical changes must preserve:

- patient isolation
- doctor scope
- clinical lifecycle
- correction/history controls
- auditability
- human clinical authority
- safe AI assistance/fallback

No AI output becomes a final clinical decision without the required human workflow.

## 10. Security Contract

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

## 11. UAT Contract

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

## 12. Release Gate

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

## 13. Change Freeze

After release certification, the certified commit is frozen. Additional changes create a new release candidate and require fresh evidence.

## 14. Operations

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

## 15. Evidence Record

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

## 16. Definition of Done

A feature is DONE only when it is:

**Implemented + Authorized + Tested + UAT-verified + Production-verified + Evidenced + Operable + Free-only compliant.**

## 17. First Controlled-Evolution Workstream

The first implementation workstream is **Patient Safety / Authorization**, classified as **HIGH RISK**.

It must begin with evidence-first discovery of the actual patient-data authorization boundary before application changes are made. The workstream acceptance contract is:

1. Identify every patient/clinical table, RPC, Edge Function, and UI path touched.
2. Prove authenticated identity and role enforcement.
3. Prove cross-patient isolation and IDOR resistance.
4. Prove doctor scope and authorized clinical linkage.
5. Prove direct RPC/endpoint access cannot bypass the same authorization boundary.
6. Prove SECURITY DEFINER functions have a constrained `search_path` and least-privilege execution semantics.
7. Run negative authorization tests before declaring the workstream complete.
8. Produce exact-commit production browser/UAT evidence.
9. Release only when the applicable Security + Clinical Safety + Release gates are fresh and PASS.

Current structural database evidence for the active Supabase project has already established the intended RLS boundary. That evidence is a starting point, not final certification; the exact production browser/UAT gate remains mandatory.

Priority order after this workstream:

1. patient safety and authorization gaps
2. clinical workflow completeness
3. financial integrity and auditability
4. scheduling/reception efficiency
5. patient dashboard completeness
6. AI assistance and fallback coverage
7. reporting/analytics
8. performance and UX refinement

Every selected workstream returns to this lifecycle before production release.
