# AZAAD — Production Certification & Continuous Operations Plan

**AI-First • Free-Only • Safety-Gated • Continuous Delivery**

Status: **ACTIVE / CONTINUOUSLY EVIDENCE-GATED**

## Current Controlled-Evolution State

Emergency DR is **CLOSED**. Controlled Evolution must not reopen the emergency transport/re-entry path.

The current release candidate is tracked by PR #96. Its certification state remains **BLOCKED / NOT PROVEN** until all P0 blockers have fresh exact-commit evidence.

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

Latest Browser E2E evidence: **16/21 PASS**, with five failures downstream of the Appwrite authentication boundary. The E2E secret-shape diagnostic proved presence and valid formatting only; it does not prove that the secret value matches the Appwrite password. No authentication bypass or fallback is permitted.

Clinical E2E remains independently blocked by Supabase HTTP 402 at native Auth before clinical authorization assertions execute. This is treated as a provider/platform blocker, not converted into an application workaround.

### Health audit

- Correct Neon runtime-boundary branch contains the required clinical schema.
- Neon diagnostics found no long-running queries and no locks.
- Supabase public rollback/reference tables remain present and RLS-enabled.
- Latest Supabase Auth log query returned no additional diagnostic records in the connector's 24-hour window.
- Existing security-advisor findings remain separately classified and are not promoted to P0 without causal evidence.

### Controlled repair policy

No P2/P3 work proceeds while P0 blockers remain open. P1 security findings remain preserved for the final security gate. Every repair must be canonical, isolated, targeted-tested, browser-tested where applicable, security-verified, and production-verified against the exact commit.

## Certification Model

`Change → Verification → Production → Evidence → Gate → Certification`

A missing or stale evidence item is `NOT PROVEN`, never PASS.

## Permanent Constraints

### Free-Only

AZAAD is 100% free-only. No paid provider plan, paid API, paid AI model, paid credits, paid monitoring, paid recovery resource, or paid add-on may be required to pass a gate.

If a capability cannot be proven on the free-only stack, record `NOT PROVEN ON FREE-ONLY STACK`.

### AI-First

AI is assistive only. It cannot approve or execute refunds outside the human approval chain, grant privileges, bypass RLS, impersonate an approver, make the final clinical decision, or silently mutate authoritative records. Every AI-assisted workflow requires a safe free fallback.

### Centralized Arabic/English Governance

Arabic and English are centralized only through the Patient Dashboard and Administration Dashboard. Language state must never alter authorization, clinical meaning, financial values, audit records, or authoritative database semantics.

## Certification Gates

### Gate A — Security

Authentication/session integrity, RBAC, RLS/server-side authorization, IDOR resistance, privilege escalation resistance, secret exposure, browser trust boundaries, Edge Function authorization, SECURITY DEFINER safety, and information leakage.

### Gate B — Clinical Safety

Patient isolation, doctor scope, clinical lifecycle integrity, controlled corrections/history, clinical auditability, safe AI assistance/fallback, and no AI final clinical authority.

### Gate C — Financial Integrity

`Refund Request → Doctor Approval → Management/Owner Approval → Refund Execution` for every payment/refund method, including Cash → Cash. Verify duplicate-payment/refund resistance and preserved approval history.

### Gate D — AI Governance

`Authorized user → bounded AI processing → validation → safe response/fallback → audit where sensitive`.

### Gate E — Free-Only

No paid dependency may be required by the release.

### Gate F — Resilience

Verify free/native backup/export/recovery evidence where available. Otherwise record `NOT PROVEN ON FREE-ONLY STACK`.

### Gate G — Release

`Requirement → bounded implementation → authorization → validation → security/audit → UAT → AI/fallback → deployment → production smoke/browser verification → evidence → certification`.

## UAT Contract

Reception: `Search/Register → Patient 360 → Schedule → Check-in → Payment → Receipt`

Doctor: `Queue → Patient → Clinical Workspace → Assessment → Diagnosis/Plan → Complete Visit`

Management/Owner: `Dashboard → Financials → Refund Request → Doctor Approval → Management/Owner Approval → Execution → Audit`

Patient: `Authenticated Patient → Patient Dashboard → Appointments/relevant information → AI assistance/fallback → Logout`

Bilingual dashboards: `Language Select → Centralized resources → Authorized rendering → Preserve data/authorization semantics → Logout`

Negative paths must reject unauthorized access, direct refunds without required approvals, AI privilege/RLS bypass, duplicate transactions, invalid appointment transitions, expired sessions, unsafe AI side effects, and locale-based authorization bypass.

## Release Evidence

Every candidate must record exact commit SHA, acceptance criteria, affected modules, CI/regression result, security/authorization result, UAT result, deployment result, production smoke/browser result, AI/fallback result where applicable, financial/audit evidence where applicable, bilingual result where applicable, known limitations, and rollback strategy.

If any required item is absent: `NOT PROVEN`.

## Continuous Operations

`Monitor → Detect → Triage → Contain → Investigate → Correct → Verify → Deploy → Monitor → Postmortem`

Monitor authentication, authorization denials, application/API failures, Edge Functions, payments/refunds, appointments, browser errors, AI failures/fallbacks, and unusual denial spikes. Never log plaintext passwords, secrets, or unnecessary sensitive patient/AI data.

## Certification States

- **CERTIFIED** — all applicable gates PASS with fresh exact-commit evidence.
- **CERTIFIED WITH ACCEPTED RISK** — only explicitly authorized non-blocking risks remain.
- **NOT PROVEN** — required evidence is missing or stale.
- **BLOCKED** — a Critical/High unresolved finding or unsafe condition exists.

## Historical Baseline Evidence

Previously verified baseline browser evidence:

- Workflow: `Azaad Production Browser E2E #347`
- Run ID: `32005754596`
- Job ID: `95314764250`
- Tested commit: `6935d6648a9e6a765ddd9c866af434928a5a3b2b`
- Result: **SUCCESS**

This remains historical baseline evidence and does not certify the current controlled-evolution candidate.

## Master Delivery Path

`Secure & Safety-Gated Production → Controlled Feature Evolution → Patient/Clinical/Financial E2E → Human-Approved AI → Security/UAT Certification → Go-Live → Continuous Operations`

The current phase remains **Controlled Evolution**. Emergency DR remains closed.
