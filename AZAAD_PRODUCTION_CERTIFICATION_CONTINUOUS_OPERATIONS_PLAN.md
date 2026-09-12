# AZAAD — Production Certification & Continuous Operations Plan

Status: **ACTIVE / CONTINUOUSLY EVIDENCE-GATED**

Emergency DR is **CLOSED**. Controlled Evolution must not reopen the emergency transport/re-entry path.

Current canonical release line: `main` at `fda2342c323baf487eb02885c1980308986f697b` (PR #114 merged). Certification state: **BLOCKED / NOT PROVEN**.

## Current blocker tree

```text
Canonical mainline fda2342c...
├── Architecture hygiene / ownership                 PASS on pre-merge head; merged in PR #114
├── Cloudflare Workers build                         PASS on exact pre-merge head
├── GitHub/Vercel/Netlify deployment checks          PASS on exact merge SHA where observed
├── Appwrite identity/session boundary               NOT CURRENTLY THE ROOT FAILURE
├── Neon data boundary
│   └── Vercel Production DATABASE_URL
│       └── neondb_owner password authentication failed
│           ├── /api/admin-auth                     → HTTP 503
│           └── /api/public-clinic-data             → HTTP 503
├── Production Browser E2E
│   ├── 15/21 PASS
│   ├── 5 admin/auth failures                        → Neon credential failure
│   └── 1 public-language-media failure              → independent investigation required
└── Certification
    └── NOT PROVEN until runtime blocker is repaired
```

The current Neon failure is an **environment/runtime configuration blocker**, not a reason to introduce a Supabase fallback or alter the canonical application boundary. The canonical production architecture remains Vercel runtime + Appwrite identity/session + Neon data. Supabase is legacy migration/DR evidence only.

## Evidence discipline

- Never transfer a successful result from an older SHA to a newer SHA.
- The exact production deployment and exact commit must be identified before interpreting runtime evidence.
- A successful build/deployment does not prove database credentials, browser behavior, UAT, or certification.
- A missing or stale evidence item is `NOT PROVEN`, never PASS.
- Fix environment blockers at the owning platform boundary; do not encode credentials, fallback providers, or test bypasses into application code.

## Controlled repair rule

No P2/P3 work proceeds while Critical/High production blockers remain open unless the work is an independent read-only investigation or documentation/guardrail improvement that cannot change the failing boundary.

Every repair must be canonical, isolated, targeted-tested, browser-tested where applicable, security-verified, and production-verified against the exact resulting commit.

## Certification path

`Secure & Safety-Gated Production → Controlled Feature Evolution → Patient/Clinical/Financial E2E → Human-Approved AI → Security/UAT Certification → Go-Live → Continuous Operations`

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

This is historical evidence only and does not certify the current mainline.

## Certification states

- **CERTIFIED** — all applicable gates PASS with fresh exact-commit evidence.
- **CERTIFIED WITH ACCEPTED RISK** — only explicitly authorized non-blocking risks remain.
- **NOT PROVEN** — required evidence is missing or stale.
- **BLOCKED** — a Critical/High unresolved finding or unsafe condition exists.
