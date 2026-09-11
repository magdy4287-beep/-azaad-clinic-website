# AZAAD Production Hardening → UAT → Release Governance → Operations

Status: **ADOPTED / ACTIVE**

## 0. Canonical production architecture

- Production source of truth: GitHub `main` after release governance approval.
- Production hosting/runtime: **Vercel**.
- Identity/authentication: **Appwrite**.
- Application data: **Neon Postgres**.
- Browser session: server-managed HttpOnly session; privileged Appwrite/Neon credentials never enter browser code.
- Supabase: **legacy migration / historical DR evidence only**. It is not a production runtime, authentication boundary, database owner, or browser dependency.
- Free-only constraint: no production requirement may depend on a paid plan, paid API, paid AI model, paid credits, or paid add-on.

Every module follows:

`UI owner → runtime owner → data owner → backend boundary → permission boundary → E2E contract → production evidence`

No duplicate runtime owner is accepted merely because an older implementation still exists in the repository. Legacy source may remain only when it is explicitly unreachable, transformed safely, or retained as migration/DR evidence and protected by a gate.

## 1. Free-only + AI-first constraint

AZAAD must remain operational on the free-first stack. Never upgrade a provider, add paid infrastructure, add paid AI, or introduce hidden paid dependencies merely to make a gate pass.

AI is assistive only. It may search, summarize, classify, draft, recommend, analyze, or navigate within explicit authorization boundaries. AI must never:

- approve or execute a refund outside the human approval chain
- grant or escalate privileges
- bypass authorization or privacy controls
- impersonate an authorized human approver
- make the final clinical decision
- silently mutate authoritative identity, permission, financial, clinical, or audit records

Every AI surface requires a safe non-AI fallback. AI failure, timeout, malformed output, or unavailable provider must not block safe core clinic operations.

## 2. Production hardening gate

Every production change is evaluated for:

- Appwrite authentication and session integrity
- RBAC and least privilege
- server-side authorization and doctor/patient scoping
- IDOR/cross-patient access
- secret exposure and browser trust boundaries
- XSS/injection/unsafe redirects
- abuse resistance where applicable
- auditability of sensitive actions
- financial and clinical data integrity
- AI safety and fallback behavior
- error/information leakage
- Arabic/English and RTL/LTR behavior
- responsive behavior
- exact production SHA provenance

Severity:

- Critical: release blocker.
- High: release blocker unless explicitly risk-accepted by the authorized human owner with evidence.
- Medium: release only with documented owner/follow-up.
- Low: backlog unless it affects a production gate.

## 3. Financial safety

Refunds use exactly:

`Refund Request → Doctor Approval → Management/Owner Approval → Refund Execution`

The server owns authorization and state transitions. The browser and AI cannot bypass or impersonate an approver. Completed financial records are not destructively edited; corrections use controlled workflows, duplicate transactions are rejected, and sensitive actions are attributable to an authenticated actor.

## 4. Clinical safety

Clinical access is authenticated, role-scoped, and patient-scoped. Doctor access must be bound to the authenticated staff/doctor identity. Cross-patient access, privilege escalation, and client-only authorization are release blockers.

Historical clinical records remain auditable through controlled correction/archive workflows. AI remains assistive and cannot make the final clinical decision.

## 5. UAT contract

UAT validates complete workflows rather than isolated controls.

### Reception
`Search/Register → Patient 360 → Schedule → Check-in → Payment → Receipt`

### Doctor
`Queue → Patient → Clinical Workspace → Assessment → Diagnosis/Plan → Complete Visit`

### Management/Owner
`Dashboard → Financials → Refund Request → Doctor Approval → Management/Owner Approval → Execution → Audit`

### Administration
`Users → Roles → Permissions → Audit → Configuration`

### Patient Dashboard
`Authenticated Patient → Dashboard → Appointments → patient-facing information → safe AI assistance/fallback → Logout`

### Negative UAT
Must reject unauthorized patient/clinical/financial access, direct refund execution without both approvals, AI approval or privilege escalation, duplicate payment/refund, invalid appointment transitions, expired/invalid sessions, and unsafe state changes caused by AI failure.

## 6. Release governance

No production change is ready from a Git commit alone.

Required sequence:

`Requirement → bounded change → implementation → authorization → validation → security/audit → errors → i18n → responsive → AI/fallback checks → CI → production deployment → production smoke/browser E2E → exact-SHA evidence`

Required evidence for the exact production commit:

- CI/regression result
- security/authorization result
- applicable UAT result
- Vercel production deployment result
- production smoke/browser result
- AI/fallback result when applicable
- audit/financial evidence when applicable
- rollback/restore evidence when applicable

Missing evidence is **NOT PROVEN**, never an implied PASS.

## 7. Deterministic engineering / self-healing policy

AZAAD uses an evidence-driven loop:

`ROOT SCAN → OWNERSHIP MAP → ROOT CAUSE → MINIMAL SAFE CHANGE → STATIC GATES → BUILD → BROWSER/E2E → EXACT SHA → DOCUMENT → NEXT ROOT SCAN`

Self-healing means deterministic diagnosis and safe, bounded remediation with verification. CI must not silently mutate source, merge pull requests, perform destructive database/provider operations, or weaken a failing contract to obtain a green result.

When a failure occurs, improve the missing capability or guardrail rather than merely changing the symptom-level assertion.

## 8. Operations

Production incidents follow:

`Detect → Triage → Contain → Investigate → Correct → Verify → Deploy → Monitor → Postmortem`

P0 includes patient-data exposure, security breach, financial corruption, or catastrophic production failure. P1 includes a major or unsafe production workflow outage.

Protect evidence first. Do not perform destructive emergency edits that erase the forensic trail. AI incidents follow the same containment and audit discipline as other application incidents.

## 9. Backup / recovery / DR

Recovery evidence must use free/native capabilities where possible. A paid-only restore drill is not a production dependency.

Supabase may be retained as migration or historical DR evidence, but recovery must not assume Supabase is the active AZAAD runtime. Portable export/restore procedures must be independently verifiable against the canonical Appwrite + Neon + Vercel architecture.

A recovery capability that cannot be proven on the free-only stack is explicitly **NOT PROVEN ON FREE-ONLY STACK** rather than silently converted into a paid requirement.

## 10. Go-Live rule

AZAAD is operationally certified only when Identity, Auth, Sessions, RBAC, Patient, Booking, Scheduling, Doctor, Clinical, Finance, Administration, Audit, Security, AI Safety, Backup, Restore, DR, Monitoring, Mobile, Arabic, English, CI, E2E, UAT, Production, SOP, Staff Training, and the Go-Live Drill have applicable evidence for the same release baseline.

A passing historical run does not certify a newer SHA. Every release must prove its own exact production artifact and runtime behavior.
