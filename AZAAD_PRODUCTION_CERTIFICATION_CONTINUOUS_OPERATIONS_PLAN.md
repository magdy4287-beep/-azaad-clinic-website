# AZAAD — Production Certification & Continuous Operations Plan

**AI-First • Free-Only • Safety-Gated • Continuous Delivery**

Status: **ACTIVE / CONTINUOUSLY EVIDENCE-GATED**  
Effective branch: `main`  
Production source of truth: `main` → GitHub Pages.  
Backend: provider-neutral controlled runtime target with Neon PostgreSQL + Appwrite identity/storage; Supabase retained as rollback/reference and for the existing clinical control plane until provider blockers are resolved.

## Current Controlled-Evolution State

Emergency DR is **CLOSED** and must not be reopened by controlled-evolution work.

Current release candidate:

- PR: `#96`
- Branch: `controlled-evolution/browser-e2e-root-fix`
- Head SHA: `35b3d13826e2ae7ce60afca7382e842fb7833011`
- Base SHA: `558f3663a4dfaf78b07c916eea24e3050bf0029`
- Certification state: **BLOCKED / NOT PROVEN**

### Fresh blocker tree

```text
Controlled Evolution
├── Canonical build / artifact parity              PASS
├── Admin restore boundary                         PASS
├── Appwrite static/security contract              PASS
├── Public / Patient / Responsive contracts        PASS
├── P0-A Admin authentication
│   └── Appwrite session_create → HTTP 401
│       └── user_invalid_credentials
│           └── external credential state not proven
└── P0-B Clinical authentication
    └── Supabase Auth password grant → HTTP 402
        └── provider/platform blocker
```

The latest Browser E2E evidence is **16/21 passing** with five failures downstream of the Appwrite authentication boundary. The E2E secret-shape diagnostic proved presence and valid formatting only; it does not prove that the secret value matches the Appwrite user's password. No authentication bypass or fallback is permitted.

Clinical E2E remains independently blocked by Supabase HTTP 402 at native Auth before clinical authorization assertions execute. This is treated as a provider/platform blocker, not converted into an application workaround.

### Health-audit findings

- Correct Neon runtime-boundary branch is populated with the required clinical schema.
- Neon current diagnostics found no long-running queries and no locks.
- Supabase public tables relevant to the rollback/reference control plane remain present and RLS-enabled.
- Supabase Auth logs did not provide additional diagnostic records in the latest 24-hour connector window.
- Existing Supabase security-advisor findings remain separately classified and are not promoted to P0 without fresh causal evidence.

### Controlled repair policy

No P2/P3 work proceeds while P0 blockers remain open. P1 security findings are preserved for the final security gate and are not weakened to make CI green. Every repair must be canonical, isolated, targeted-tested, browser-tested where applicable, security-verified, and production-verified against the exact commit.

## Permanent Constraints

### Free-Only

AZAAD is 100% free-only. No paid provider plan, paid API, paid AI model, paid credits, paid monitoring, paid recovery resource, or paid add-on may be required to pass a gate.

If a capability cannot be proven on the free-only stack, record:

`NOT PROVEN ON FREE-ONLY STACK`

Do not weaken the control and do not introduce a paid dependency merely to obtain PASS.

### AI-First

AI is a platform capability across applicable administrative, reception, scheduling, patient-facing, Patient Dashboard, clinical-support, financial/reporting, management, and analytics surfaces.

AI is assistive only. It cannot approve or execute refunds outside the human approval chain, grant privileges, bypass RLS, impersonate an approver, make the final clinical decision, or silently mutate authoritative records.

Every AI-assisted workflow requires a safe free fallback and must not make AI a single point of failure for core clinic operations.

### Centralized Arabic/English Language Governance

AZAAD supports **Arabic and English centrally only through the Patient Dashboard and Administration Dashboard**.

- The Patient Dashboard is the centralized patient-facing bilingual surface.
- The Administration Dashboard is the centralized administrative bilingual surface.
- Language selection, translation resources, labels, navigation, validation messages, and dashboard-level accessibility behavior must be governed centrally rather than duplicated across modules.
- Clinical, reception, doctor, financial, scheduling, and other operational workspaces remain governed by their existing product contracts and do not become independently bilingual surfaces unless a separately approved requirement is introduced.
- Centralized language support must not alter authorization, clinical meaning, financial values, audit records, or authoritative database semantics.
- Every bilingual change remains subject to the same exact-commit evidence and release gates as any other application change.

## Certification Model

Certification is evidence-based:

`Change → Verification → Production → Evidence → Gate → Certification`

A missing or stale evidence item is `NOT PROVEN`, not PASS.

Evidence must correspond to the exact production commit under certification.

## Certification Gates

### Gate A — Security Certification

Verify authentication/session integrity, RBAC, RLS/server-side authorization, IDOR resistance, privilege escalation resistance, secret exposure controls, browser trust boundaries, Edge Function authorization, SECURITY DEFINER safety, and information leakage.

Critical findings block release. High findings block release unless explicitly risk-accepted by an authorized human with evidence.

### Gate B — Clinical Safety Certification

Verify patient isolation, doctor scope, clinical lifecycle integrity, controlled corrections/history, clinical auditability, safe AI assistance/fallback, and no AI final clinical authority.

### Gate C — Financial Integrity Certification

Verify:

`Refund Request → Doctor Approval → Management/Owner Approval → Refund Execution`

for every payment/refund method, including Cash → Cash. Verify duplicate-payment/refund resistance, controlled financial corrections, authenticated attribution, and preserved approval history.

### Gate D — AI Governance Certification

For each changed AI surface verify:

`Authorized user → bounded AI processing → validation → safe response/fallback → audit where sensitive`

Test provider/model failure, timeout, malformed output, quota exhaustion where observable, unauthorized requests, and attempted consequential actions.

### Gate E — Free-Only Certification

Review new dependencies, workflows, APIs, models, monitoring, storage, and recovery mechanisms. No paid dependency may be required by the release.

### Gate F — Resilience Certification

Verify free/native backup/export/recovery evidence where available. A real restore drill is required only when the free-only environment can perform it without introducing a paid dependency. Otherwise record `NOT PROVEN ON FREE-ONLY STACK`.

### Gate G — Release Certification

Required sequence:

`Requirement → bounded implementation → authorization → validation → security/audit → UAT → AI/fallback where applicable → deployment → production smoke/browser verification → evidence → certification`

## UAT Certification Contract

### Reception

`Search/Register → Patient 360 → Schedule → Check-in → Payment → Receipt`

### Doctor

`Queue → Patient → Clinical Workspace → Assessment → Diagnosis/Plan → Complete Visit`

### Management/Owner

`Dashboard → Financials → Refund Request → Doctor Approval → Management/Owner Approval → Execution → Audit`

### Patient

`Authenticated Patient → Patient Dashboard → Appointments/relevant information → AI assistance/fallback → Logout`

### Bilingual Dashboard Contract

`Language Select → Patient Dashboard / Administration Dashboard → Centralized Arabic/English resources → Authorized content rendering → Preserve data/authorization semantics → Logout`

Negative paths must reject unauthorized patient/clinical/financial access, direct refunds without both approvals, AI approval/privilege escalation/RLS bypass, duplicate transactions, invalid appointment transitions, expired sessions, unsafe AI side effects, and locale state that attempts to bypass authorization.

## Release Evidence Record

For every release candidate record:

- exact commit SHA
- acceptance criteria
- affected modules
- CI/regression result
- security/authorization result
- UAT result
- production deployment result
- production smoke/browser result
- AI/fallback result when applicable
- financial/audit evidence when applicable
- bilingual dashboard result when applicable
- known limitations
- rollback strategy

If any required item is absent: `NOT PROVEN`.

## Continuous Operations

Production follows:

`Monitor → Detect → Triage → Contain → Investigate → Correct → Verify → Deploy → Monitor → Postmortem`

Monitor authentication, authorization denials, application/API failures, Edge Functions, payments/refunds, appointments, browser errors, AI failures/fallbacks, and unusual denial spikes.

Do not log plaintext passwords, secrets, or unnecessary sensitive patient/AI data.

## Certification States

- **CERTIFIED** — all applicable gates PASS with fresh exact-commit evidence.
- **CERTIFIED WITH ACCEPTED RISK** — only explicitly authorized non-blocking risks remain, with documented evidence.
- **NOT PROVEN** — required evidence is missing or stale.
- **BLOCKED** — a Critical/High unresolved finding or unsafe condition exists.

## Historical Baseline Evidence

A real GitHub Actions Production Browser E2E baseline run was verified previously:

- Workflow: `Azaad Production Browser E2E #347`
- Run ID: `32005754596`
- Job: `browser-e2e`
- Job ID: `95314764250`
- Tested commit: `6935d6648a9e6a765ddd9c866af434928a5a3b2b`
- Result: **SUCCESS**

This is historical baseline evidence only. It does not certify the current controlled-evolution candidate.

## Master Delivery Path

`Secure & Safety-Gated Production → Controlled Feature Evolution → Patient/Clinical/Financial E2E → Human-Approved AI → Security/UAT Certification → Go-Live → Continuous Operations`

The current phase remains **Controlled Evolution**. Emergency DR remains closed. No emergency transport/re-entry operation is permitted.
