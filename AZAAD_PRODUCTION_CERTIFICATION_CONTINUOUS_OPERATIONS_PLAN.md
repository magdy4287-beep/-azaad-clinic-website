# AZAAD — Production Certification & Continuous Operations Plan

Status: **ACTIVE / CONTINUOUSLY EVIDENCE-GATED**

Emergency DR is **CLOSED**. Controlled Evolution must not reopen the emergency transport/re-entry path.

Current release candidate: PR #96, branch `controlled-evolution/browser-e2e-root-fix`. Certification state: **BLOCKED / NOT PROVEN**.

## Current blocker tree

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

Latest Browser E2E evidence is **16/21 PASS**; the five failures are downstream of the Appwrite authentication boundary. The E2E secret-shape diagnostic established only presence and valid formatting, not password equality. No auth bypass or fallback is permitted.

Clinical E2E is independently blocked by Supabase HTTP 402 at native Auth before clinical authorization assertions execute. No application workaround is permitted.

## Health audit evidence

- Correct Neon runtime-boundary branch contains the required clinical schema.
- Neon diagnostics found no long-running queries and no locks.
- Supabase rollback/reference public tables remain present and RLS-enabled.
- Latest Supabase Auth log query returned no additional diagnostic records in the connector's 24-hour window.
- Existing security-advisor findings remain separately classified until causal evidence warrants escalation.

## Controlled repair rule

No P2/P3 work proceeds while P0 blockers remain open. P1 security findings remain preserved for the final security gate. Every repair must be canonical, isolated, targeted-tested, browser-tested where applicable, security-verified, and production-verified against the exact commit.

## Certification path

`Secure & Safety-Gated Production → Controlled Feature Evolution → Patient/Clinical/Financial E2E → Human-Approved AI → Security/UAT Certification → Go-Live → Continuous Operations`

A missing or stale evidence item is `NOT PROVEN`, never PASS.

## Gates

Security: authentication/session integrity, RBAC, RLS/server authorization, IDOR resistance, privilege escalation resistance, secret exposure, browser trust boundaries, Edge Function authorization, SECURITY DEFINER safety, information leakage.

Clinical: patient isolation, doctor scope, clinical lifecycle, controlled corrections/history, auditability, safe AI assistance/fallback, no AI final clinical authority.

Financial: `Refund Request → Doctor Approval → Management/Owner Approval → Refund Execution`, duplicate/refund resistance, controlled corrections, authenticated attribution, preserved approval history.

AI: `Authorized user → bounded AI processing → validation → safe response/fallback → audit where sensitive`.

Free-only: no paid dependency required for release certification.

Resilience: free/native backup/export/recovery evidence where available; otherwise `NOT PROVEN ON FREE-ONLY STACK`.

Release: `Requirement → bounded implementation → authorization → validation → security/audit → UAT → AI/fallback → deployment → production smoke/browser verification → evidence → certification`.

## UAT contract

Reception: `Search/Register → Patient 360 → Schedule → Check-in → Payment → Receipt`

Doctor: `Queue → Patient → Clinical Workspace → Assessment → Diagnosis/Plan → Complete Visit`

Management/Owner: `Dashboard → Financials → Refund Request → Doctor Approval → Management/Owner Approval → Execution → Audit`

Patient: `Authenticated Patient → Patient Dashboard → Appointments/relevant information → AI assistance/fallback → Logout`

Bilingual dashboards: `Language Select → Centralized resources → Authorized rendering → Preserve data/authorization semantics → Logout`

Negative paths must reject unauthorized access, direct refunds without required approvals, AI privilege/RLS bypass, duplicate transactions, invalid appointment transitions, expired sessions, unsafe AI side effects, and locale-based authorization bypass.

## Continuous operations

`Monitor → Detect → Triage → Contain → Investigate → Correct → Verify → Deploy → Monitor → Postmortem`

Never log plaintext passwords, secrets, or unnecessary sensitive patient/AI data.

## Historical baseline

Previously verified baseline browser evidence:

- Workflow: `Azaad Production Browser E2E #347`
- Run ID: `32005754596`
- Job ID: `95314764250`
- Tested commit: `6935d6648a9e6a765ddd9c866af434928a5a3b2b`
- Result: **SUCCESS**

This is historical evidence only and does not certify the current controlled-evolution candidate.

## Certification states

- **CERTIFIED** — all applicable gates PASS with fresh exact-commit evidence.
- **CERTIFIED WITH ACCEPTED RISK** — only explicitly authorized non-blocking risks remain.
- **NOT PROVEN** — required evidence is missing or stale.
- **BLOCKED** — a Critical/High unresolved finding or unsafe condition exists.
