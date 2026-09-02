# AZAAD — Production Certification & Continuous Operations Plan

**AI-First • Free-Only • Safety-Gated • Continuous Delivery**

Status: **ACTIVE / CONTINUOUSLY EVIDENCE-GATED**  
Effective branch: `main`  
Production source of truth: `main` → GitHub Pages.  
Backend: Supabase Auth/Postgres/RLS/Edge Functions.

## 1. Purpose

This plan is the certification and continuous-operations layer above `AZAAD_ENGINEERING_CONTROL_PLAN.md` and `AZAAD_PRODUCTION_HARDENING_UAT_RELEASE_OPERATIONS.md`.

It does not replace existing controls. It requires fresh evidence for each release candidate and prevents unrelated work from being treated as certified under an older evidence set.

## 2. Permanent Constraints

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

## 3. Certification Model

Certification is evidence-based:

`Change → Verification → Production → Evidence → Gate → Certification`

A missing or stale evidence item is `NOT PROVEN`, not PASS.

Evidence must correspond to the exact production commit under certification.

## 4. Certification Gates

### Gate A — Security Certification

Verify:

- authentication and session integrity
- RBAC and privilege boundaries
- RLS/server-side authorization
- cross-patient/IDOR resistance
- privilege-escalation resistance
- secret exposure controls
- browser trust boundaries
- Edge Function authorization
- SECURITY DEFINER safety where applicable
- error/information leakage

Critical findings block release. High findings block release unless explicitly risk-accepted by an authorized human with evidence.

### Gate B — Clinical Safety Certification

Verify:

- patient isolation
- doctor scope
- clinical lifecycle integrity
- controlled corrections/history
- clinical auditability
- safe AI assistance and fallback
- no AI final clinical authority

### Gate C — Financial Integrity Certification

Verify the invariant:

`Refund Request → Doctor Approval → Management/Owner Approval → Refund Execution`

This applies to every payment/refund method, including Cash → Cash.

Verify duplicate-payment/refund resistance, controlled financial corrections, authenticated attribution, and preserved approval history.

### Gate D — AI Governance Certification

For each changed AI surface verify:

`Authorized user → bounded AI processing → validation → safe response/fallback → audit where sensitive`

Test provider/model failure, timeout, malformed output, quota exhaustion where observable, unauthorized requests, and attempted consequential actions.

AI failure must degrade to safe free/native/deterministic/manual behavior.

### Gate E — Free-Only Certification

Review new dependencies, workflows, APIs, models, monitoring, storage, and recovery mechanisms.

No paid dependency may be required by the release.

### Gate F — Resilience Certification

Verify free/native backup/export/recovery evidence where available. A real restore drill is required only when the free-only environment can perform it without introducing a paid dependency. Otherwise record:

`NOT PROVEN ON FREE-ONLY STACK`

Never claim recovery certification without evidence.

### Gate G — Release Certification

Required sequence:

`Requirement → bounded implementation → authorization → validation → security/audit → UAT → AI/fallback where applicable → deployment → production smoke/browser verification → evidence → certification`

## 5. Continuous Operations

Production follows:

`Monitor → Detect → Triage → Contain → Investigate → Correct → Verify → Deploy → Monitor → Postmortem`

Monitor authentication, authorization denials, application/API failures, Edge Functions, payments/refunds, appointments, browser errors, AI failures/fallbacks, and unusual denial spikes.

Do not log plaintext passwords, secrets, or unnecessary sensitive patient/AI data.

## 6. UAT Certification Contract

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

Negative bilingual paths must reject unsupported language states and must never allow translation or locale state to bypass authorization or change authoritative clinical/financial meaning.

### Negative paths

Reject unauthorized patient/clinical/financial access, direct refunds without both approvals, AI approval/privilege escalation/RLS bypass, duplicate transactions, invalid appointment transitions, expired sessions, unsafe AI side effects, and language/locale state that attempts to bypass authorization.

## 7. Release Evidence Record

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

## 8. Change Freeze

Once certified, the release candidate is frozen. Unrelated changes require a new bounded change and fresh evidence.

## 9. Certification States

- **CERTIFIED** — all applicable gates PASS with fresh exact-commit evidence.
- **CERTIFIED WITH ACCEPTED RISK** — only explicitly authorized non-blocking risks remain, with documented evidence.
- **NOT PROVEN** — required evidence is missing or stale.
- **BLOCKED** — a Critical/High unresolved finding or unsafe condition exists.

Free-tier limitations are recorded as limitations, never hidden and never converted into paid requirements.

## 10. Current Baseline

Core Stack & Production Gates: **PASS / LOCKED** under `AZAAD_ENGINEERING_CONTROL_PLAN.md`.

Production Hardening → UAT → Release Governance → Operations: **ACTIVE / ENFORCED** under `AZAAD_PRODUCTION_HARDENING_UAT_RELEASE_OPERATIONS.md`.

This plan is the certification and continuous-operations layer.

## 11. Verified Production Browser Evidence — Baseline

A real GitHub Actions Production Browser E2E run has been verified for the `main` baseline:

- Workflow: `Azaad Production Browser E2E #347`
- Run ID: `32005754596`
- Job: `browser-e2e`
- Job ID: `95314764250`
- Tested commit: `6935d6648a9e6a765ddd9c866af434928a5a3b2b`
- Result: **SUCCESS**

The job completed successfully for the following certification-relevant steps:

- Checkout exact commit under test
- Verify exact commit under test
- Install Playwright test runner
- Install Chromium
- Run browser E2E against production on `main`
- Enforce Production Certification policy
- Upload Playwright report

This is **fresh exact-commit browser/policy evidence** for the baseline. It does not by itself replace the individual Security, Clinical, Financial, AI Governance, Free-Only, and Resilience evidence requirements; those remain separately evidence-gated.

## 12. Continuous Certification Rule

The Production Browser E2E workflow is the recurring evidence path. It supports push/PR validation, manual dispatch, and scheduled re-certification.

A successful browser run is recorded as production verification evidence. A failed run blocks the corresponding release candidate until triage and fresh verification succeed.

No manual screenshot, inferred result, or stale run may be substituted for the required exact-commit CI evidence.

## 13. Next Controlled-Evolution Phase

After the current baseline evidence is recorded, feature work proceeds under:

`AZAAD_CONTROLLED_EVOLUTION_FEATURE_DELIVERY_PLAN.md`

The next phase does not loosen certification. Every new feature remains bounded, AI-first where applicable, free-only, safety-gated, UAT-tested, and independently evidenced before release.

## 14. Master Delivery Path to Go-Live

The permanent project delivery path is:

`Secure & Safety-Gated Production → Controlled Feature Evolution → Patient/Clinical/Financial E2E → Human-Approved AI → Security/UAT Certification → Go-Live → Continuous Operations`

with **centralized Arabic/English bilingual support limited to the Patient Dashboard and Administration Dashboard**.

This sentence is the project-level delivery contract. It does not replace the individual gates above; it is the concise operating map connecting them from the certified baseline to live clinic operations.

## 15. Controlled-Evolution Certification Overlay — Current State

This section is authoritative for the current controlled-evolution workstream and does not reopen Emergency DR.

### 15.1 DR boundary

Emergency DR is **CLOSED**. Supabase remains retained as rollback/reference. No controlled-evolution workflow may reopen the emergency transport gate or perform emergency re-entry.

### 15.2 Provider-neutral runtime contract

The controlled runtime target is:

`Vercel → Neon PostgreSQL + Appwrite identity/storage`

Supabase runtime access is not an accepted production dependency for the provider-neutral path. The runtime-health contract is fail-closed and requires Neon plus independent identity/storage configuration.

### 15.3 Fresh Production Health evidence

- Latest controlled Vercel deployment reached **READY** after the workflow-ownership build gate was corrected.
- The preceding build failure was a concrete workflow-governance root cause: the new controlled P0 workflow was not accepted by the workflow ownership gate at that revision.
- The production project currently reports **no runtime error clusters in the selected 1-hour audit window**.
- Vercel build logs currently contain only the existing Node engine warning and a successful build completion; the warning is non-blocking and does not constitute a certification failure.

### 15.4 P0 root causes currently open

**P0-A — Authentication provider dependency**

Production/clinical authentication still depends on Supabase `staff-login` / Supabase Auth. Prior controlled clinical evidence showed HTTP 402 at that boundary. This blocks provider-neutral authentication certification and therefore blocks Clinical E2E certification.

**P0-B — Neon data parity is not yet independently proven**

The controlled Neon parity gate exists and is fail-closed. It must prove authoritative clinical count parity plus public/private runtime schema/function invariants before Neon can be treated as certification-equivalent.

### 15.5 P1 findings currently open

**P1-A — Public SECURITY DEFINER RPC exposure**

Supabase Security Advisor currently reports `public.clinic_frontdesk_checkin(uuid,text)` as executable by authenticated users while defined as SECURITY DEFINER. This must be reviewed against the intended authorization boundary and corrected or explicitly constrained before final security certification.

**P1-B — Leaked Password Protection disabled**

Supabase Auth Security Advisor currently reports leaked-password protection disabled. This remains a security certification blocker for the Supabase rollback/reference environment until the control is addressed or the environment is formally excluded from the final security boundary with evidence.

### 15.6 Performance findings

The current Supabase Performance Advisor reports many `unused_index` INFO findings. These are optimization candidates, not P0/P1 release blockers, and are intentionally deferred until blocking runtime/security issues are resolved.

### 15.7 Controlled repair rule

Every P0/P1 repair must follow:

`Root cause → smallest safe change → isolated controlled revision → targeted verification → Browser/clinical verification → security verification → production verification`

No test bypass, assertion weakening, empty commit, or stale evidence substitution is permitted.

### 15.8 Certification lock

Until P0-A and P0-B are closed with fresh exact-commit evidence:

- Clinical E2E: **BLOCKED / NOT PROVEN**
- Financial E2E: **BLOCKED / NOT PROVEN**
- Final Security Certification: **BLOCKED / NOT PROVEN**
- Production Go-Live Certification: **BLOCKED / NOT PROVEN**

The project remains in controlled evolution, not Emergency DR.
