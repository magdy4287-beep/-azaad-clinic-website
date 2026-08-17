# AZAAD Production Hardening → UAT → Release Governance → Operations

Status: **ADOPTED / ACTIVE**

Effective branch: `main`
Production source of truth: `main` → GitHub Pages.
Backend: Supabase Auth/Postgres/RLS/Edge Functions.
Vercel: optional preview/development infrastructure unless explicitly promoted by a future release decision.

## 0. Free-Only + AI-First Engineering Constraint

AZAAD is a **100% free-only project** and an **AI-first clinic platform**.

No production requirement, gate, architecture decision, recovery procedure, monitoring path, AI integration, deployment path, or operational dependency may require a paid plan, paid API, paid infrastructure, paid AI model, paid credits, or paid add-on.

Rules:

- Never upgrade a provider plan to make a gate pass.
- Never create a paid development/preview/recovery resource automatically.
- Never introduce a paid API, paid AI model, paid credit pool, or paid service as a hidden dependency.
- Prefer free/native capabilities first.
- AI assistance is expected across the clinic platform, including administrative, reception, scheduling, patient-facing, clinical-support, financial/reporting, management, and the Patient Dashboard surfaces, subject to role authorization and safety boundaries.
- AI is assistive and must not become a single point of failure for core operations.
- Every AI-assisted workflow must have a safe free fallback: deterministic application logic, a free/native model or capability, cached/previously computed non-sensitive results where appropriate, or a human/manual workflow.
- If a capability cannot be proven on the free-only stack, record it as **NOT PROVEN ON FREE-ONLY STACK** rather than converting it into a paid requirement.
- A free-tier limitation is not a reason to weaken a security, clinical, privacy, or financial control.
- Production must remain operational without optional paid infrastructure or paid AI.

### AI safety and human authority

AI may assist with search, summarization, classification, drafting, navigation, insights, recommendations, analytics, and other explicitly bounded assistance.

AI must never:

- approve or execute a refund outside the human approval chain
- grant or escalate privileges
- bypass RLS or authorization
- impersonate an authorized human approver
- make the final clinical decision
- silently alter authoritative financial, clinical, identity, permission, or audit records

AI outputs are untrusted inputs until validated by the applicable authorization and domain rules.

Recovery rule: a paid-only restore drill is **not** an acceptable production dependency. Recovery evidence must use free/native capabilities where available; otherwise the limitation is documented and the gate remains explicitly NOT PROVEN.

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
- AI safety boundaries and fallback behavior
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

## 4. AI Coverage & Patient Dashboard Gate

AI is a platform capability, not a standalone feature.

Applicable AI-assisted surfaces include, according to role and enabled capability:

- reception/front desk assistance
- patient search and navigation assistance
- scheduling and booking assistance
- waiting-list assistance
- patient-facing assistance and the Patient Dashboard
- doctor clinical-workspace assistance
- assessment and clinical summarization assistance
- management dashboards and operational insights
- financial/reporting analysis assistance
- administrative and configuration assistance
- analytics and decision-support assistance

Each surface must preserve authorization, privacy, auditability, and human authority. AI availability must never be required for a core transaction to remain safe and usable.

For each AI-assisted surface, release evidence should establish:

`AI request → authorization → bounded processing → validation → safe response/fallback → audit where sensitive`

A missing AI provider, exhausted free quota, model failure, malformed output, or timeout must degrade safely without bypassing controls or blocking essential non-AI clinic workflows.

## 5. UAT Contract

UAT must cover complete workflows, not isolated buttons.

### Reception

`Search/Register → Patient 360 → Schedule → Check-in → Payment → Receipt`

### Doctor

`Queue → Patient → Clinical Workspace → Assessment → Diagnosis/Plan → Complete Visit`

### Management/Owner

`Dashboard → Financials → Refund Request → Doctor Approval → Management/Owner Approval → Execution → Audit`

### Administration

`Users → Roles → Permissions → Audit → Configuration`

### Patient Dashboard

`Authenticated Patient → Dashboard → Appointments → Relevant patient-facing information → Safe AI assistance/fallback → Logout`

### AI UAT

For each applicable AI surface:

`Authorized user → AI assistance → bounded output → validation → safe fallback → no unauthorized side effect`

### Negative UAT

The following must be rejected:

- unauthorized patient access
- unauthorized clinical access
- unauthorized financial action
- direct refund execution without both approvals
- AI financial approval
- AI privilege escalation
- AI authorization bypass
- duplicate payment/refund
- invalid appointment state transition
- expired/invalid session access
- AI failure causing an unsafe or unauthorized state change

## 6. Release Governance

No production change is considered ready from a Git commit alone.

Required sequence:

`Requirement → bounded change → implementation → authorization checks → validation → audit/security → errors → Arabic/English → responsive → AI/fallback checks where applicable → verification → production deployment → production smoke → evidence`

Every change must identify:

- acceptance criteria
- affected modules
- security impact
- data/financial impact
- AI impact and fallback impact when applicable
- rollback strategy
- verification evidence

A passing Core Gate must not be weakened to accommodate an unrelated change.

### Executable governance enforcement

`.github/workflows/azaad-release-governance-gate.yml` enforces this document on `main` and pull requests targeting `main`.

The gate verifies that:

- this policy is present and contains the critical financial, release, AI, free-only, and evidence rules
- one-time/once workflows cannot acquire automatic `push`, `schedule`, `pull_request`, or `pull_request_target` triggers
- one-time/once workflows cannot silently introduce `secrets` or `environment` blocks

One-time workflows that have completed their migration remain manually dispatched only. They must never become part of the normal production release path.

## 7. Required Production Evidence

A release is certified only when the applicable evidence exists for the exact production commit:

- CI/regression result
- security/authorization result
- relevant UAT result
- production deployment result
- production browser/smoke result
- AI/fallback result when the change affects an AI-assisted surface
- audit/financial evidence when applicable

If evidence is missing, status is **NOT PROVEN**, not PASS.

## 8. Operations

Production incidents follow:

`Detect → Triage → Contain → Investigate → Correct → Verify → Deploy → Monitor → Postmortem`

Priority:

- P0: patient-data exposure, security breach, financial corruption, or catastrophic production failure.
- P1: major production workflow unavailable or materially unsafe.
- P2: significant degradation with workaround.
- P3: minor defect or cosmetic issue.

For P0/P1, protect evidence first and preserve audit/database history. Do not perform destructive emergency edits that erase the forensic trail.

AI incidents include unsafe output, authorization boundary failures, privacy leakage, unexpected tool/action behavior, or failure to degrade safely. Treat an AI failure as a normal application incident with the same evidence and containment discipline.

## 9. Backup / Recovery

Before operational certification, maintain and periodically test:

- database backup availability
- restore procedure
- data-integrity validation after restore
- application recovery procedure
- ownership and escalation contacts
- documented recovery objectives (RPO/RTO)

A backup that has never been restored is not considered proven recovery capability.

Paid-only recovery resources are prohibited. Use free/native recovery capabilities where available. If the free-only environment cannot provide a real restore drill, record **NOT PROVEN ON FREE-ONLY STACK** and do not claim recovery certification.

## 10. Observability

Monitor at minimum:

- authentication failures
- authorization/RLS denials
- application/API failures
- Edge Function failures
- payment/refund failures
- appointment failures
- frontend/browser errors
- AI failures, timeouts, malformed outputs, and fallback activations
- unusual access-denial spikes

Sensitive logs must not contain plaintext passwords, secrets, unnecessary patient data, or raw sensitive AI prompts/outputs unless explicitly required and appropriately protected for the operational purpose.

## 11. Change Freeze Rule

Once a release passes all applicable gates, do not continue changing unrelated code under the same release candidate. New work becomes a new bounded change and must obtain fresh evidence.

## 12. Current Adoption

The Core Stack & Production Gates remain **PASS / LOCKED** under `AZAAD_ENGINEERING_CONTROL_PLAN.md`.

This document activates the next operating layer:

**Production Hardening → UAT → Release Governance → Operations**

The layer is active, and its governance rules are executable through CI. Individual release gates remain evidence-based and must not be marked PASS without fresh evidence.

The AZAAD free-only constraint is a permanent project rule and overrides any proposal that introduces a paid dependency merely to close a gate.

The AI-first constraint is also permanent: AI may assist across the platform, including the Patient Dashboard, but every AI capability must remain free-only, role-scoped, auditable where sensitive, human-authorized for consequential actions, and safely degradable when AI is unavailable.
