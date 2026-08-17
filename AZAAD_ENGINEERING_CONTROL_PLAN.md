# AZAAD Engineering Control Plan — Core Stack & Production Gates

## Purpose

This document is the operating contract for production work on AZAAD Clinic. A feature is not considered complete because code exists or a commit was created. It is complete only when the relevant gates have fresh evidence.

## Core pipeline

```text
GitHub
  ↓
Production Deployment Provider
  ↓
Supabase
  ↓
AZAAD
```

### Deployment-provider contract

Vercel is the configured Level-1 production provider for the AZAAD Core Stack. Cloudflare Workers also has repository build evidence, but it is not the current production source of truth.

Current evidence:

1. Vercel has a READY production deployment from `main` commit `714aff0f7f4c65ad122c53ab0d9ce118775672b8`.
2. Vercel also has a READY preview deployment for PR #39 from branch `codex/azaad-engineering-control-plan-20260817`, commit `bf0aa79e25e3c501e2c97803fa33640eee7a0e76`.
3. The PR head is currently `a6302596cd017d2d7858acaa1c96739d259cd4a0`; therefore the Vercel deployment-provider gate for the exact PR head remains open until a READY deployment is tied to that exact release commit.
4. Vercel Deployment Protection/SSO is enabled on the preview URL. It must not be disabled merely to make a smoke test pass.

Required closure evidence:

1. Identify the single production source of truth for the application.
2. Prove the exact release commit has a READY Vercel deployment and verify URL/runtime health through an authenticated/protected test path when protection is enabled.
3. Do not mark the deployment gate PASS merely because a build succeeded.

The product acceptance path is:

```text
UI → Auth → Authorization → Database / Edge Function → Validation
→ Audit / Security → Error handling → Arabic / English → Responsive QA
→ Production verification
```

## Master execution phases

```text
PHASE 1  Infrastructure
   ↓
PHASE 2  Security / RLS
   ↓
PHASE 3  Patient 360
   ↓
PHASE 4  Scheduling
   ↓
PHASE 5  Check-in
   ↓
PHASE 6  Doctor Clinical Workspace
   ↓
PHASE 7  Assessment
   ↓
PHASE 8  Billing / Payments
   ↓
PHASE 9  Refund Approval
   ↓
PHASE 10 Cashier / Finance
   ↓
PHASE 11 AI
   ↓
PHASE 12 Full Security Audit
   ↓
PHASE 13 Production QA
```

A phase is DONE only when its applicable source, backend, security, integration, E2E and production gates have fresh evidence. A passing static contract alone does not close a runtime gate.

## Level 1 — Required for every production change

### 1. GitHub
- Source of truth for application code, workflows, branches, commits and PRs.
- Never use concurrent workflows that write the same production branch without an explicit concurrency strategy.
- Production changes must be traceable to a commit and PR/change record where practical.
- Do not force-push `main` as a normal delivery mechanism.

### 2. Supabase
- Database, Auth, RLS, RPCs and Edge Functions are treated as security boundaries.
- `SECURITY DEFINER` functions must use an explicit safe `search_path` and explicit schema qualification where required.
- Internal helper/trigger functions must not be executable by `anon` or ordinary authenticated clients unless explicitly required.
- Financial and clinical operations require role/permission enforcement server-side.
- Refund invariant is non-negotiable:

```text
Refund Request
 → Doctor Approval
 → Management / Owner Approval
 → Finance Processing
```

AI must never approve a refund.

### 3. Vercel / Production Provider
- A GitHub commit is not production proof.
- Production gate requires a READY deployment, HTTP success, and runtime-error review from the actual production provider.
- The provider must be explicitly identified; a successful build on another platform does not satisfy a Vercel gate automatically.
- After production changes, verify the actual deployed URL.

### 4. Codex Security
- Run a repository security audit for substantial security-sensitive changes.
- Validate findings against actual source before remediation.
- Do not weaken controls merely to make an advisory score look clean.

### 5. Frontend Testing
- Test the rendered application, not only source files.
- Required checks: page identity, non-blank render, no framework error overlay, console health, target interaction and visible resulting state.
- Browser E2E should test the exact checked-out code where possible.

## Level 2 — Required when the affected surface uses them

### API Documentation Checker
- Extract the explicit API contract from Edge/API code or supplied API material.
- Compare documentation against the contract.
- No undocumented request/response behavior should be introduced intentionally.

### React Best Practices
- Apply after multi-component React/TSX changes.
- Check component boundaries, hooks, accessibility, performance and TypeScript correctness.

### OpenAI Platform
- AI is an assistive capability, never the authorization authority for financial or clinical approval.
- Secrets remain server-side.
- AI failure/quota loss must not block core clinic operations.

### Resend
- Transactional notifications are non-blocking unless the workflow explicitly requires delivery confirmation.
- Email delivery must not bypass audit or authorization controls.

### Sent
- SMS/RCS/WhatsApp messaging is an integration layer, not the source of truth for clinical or financial state.
- Consent, opt-out and delivery state must remain auditable.

### Linear / Jira
- Use the connected work tracker when project tracking is available.
- Every material blocker, security finding or deferred production item should have a durable reference when practical.
- Jira/Confluence access is optional if the connected Atlassian instance is unavailable.

## Level 3 — Conditional integrations

Brainbase, Botpress, Exa, Agent Ready, Canva, microfn and Stripe are enabled only when the active AZAAD work item genuinely benefits from them. They must not become accidental hard dependencies of core clinic operation.

## Level 4 — Not currently required

Webflow, Wix, Base44, ShipStatic, Spaceship, Devpost, Neon, WoWSQL, Agent Community and OpenAI Ads Conversions are intentionally outside the current AZAAD production path.

## Production Gates

### Gate A — Source
- [ ] Scope identified.
- [ ] Existing implementation inspected.
- [ ] No duplicate subsystem introduced without evidence.
- [ ] Security-sensitive changes reviewed.

### Gate B — Backend Security
- [ ] Auth boundary verified.
- [ ] RLS verified.
- [ ] Privileged RPC/Edge Function authorization verified.
- [ ] Audit trail verified where required.
- [ ] Clinical/financial isolation verified.
- [ ] Refund hierarchy verified.
- [ ] Supabase Security Advisor reviewed after security-sensitive changes.

### Gate C — Frontend
- [ ] Intended screen renders.
- [ ] Target action is visible to the correct role.
- [ ] Unauthorized role cannot perform the action.
- [ ] Arabic/English behavior verified when affected.
- [ ] Responsive behavior verified when affected.
- [ ] Console/runtime errors reviewed.

### Gate D — Production
- [ ] Production provider explicitly identified.
- [ ] Deployment READY.
- [ ] Production URL returns successfully.
- [ ] Runtime error/fatal logs reviewed.
- [ ] Critical workflow smoke test completed.
- [ ] Provider evidence corresponds to the exact release commit.

### Gate E — Completion
A gate may be marked DONE only from fresh evidence. Static plausibility, a successful commit, or a planned test is not evidence of runtime success.

## Security hardening protocol for intentional SECURITY DEFINER RPCs

Some AZAAD RPCs are deliberately exposed to `authenticated` clients because the browser must invoke them, while authorization is enforced inside the function. These are not automatically considered safe merely because they pass the contract gate.

For each such RPC:

1. Keep `SECURITY DEFINER` only when required by the data-access model.
2. Require an explicit safe `search_path`.
3. Qualify privileged tables/functions with explicit schemas.
4. Perform server-side identity, active-staff, role and permission checks before mutation.
5. For refund operations, enforce the Doctor → Management/Owner → Finance sequence server-side and prevent self-approval.
6. Keep `anon` execution denied.
7. Review the Supabase Security Advisor warning as a deliberate hardening item rather than weakening the business authorization to silence the warning.
8. Prefer moving genuinely internal helpers out of exposed API schemas when that can be done without breaking required client RPC contracts.

## Current AZAAD status — 2026-08-17

### Infrastructure / Security
- Core architecture: READY
- Core Control Plan contract: PASS on commit `d5328fc6923776b7362b3315430d77db07974e64`
- Refund hierarchy contract: PASS on the fresh Core Gate CI run
- Security audit contract: PASS on the fresh Security Audit CI run
- Cloudflare Workers production build: PASS for the same CI cycle; this is build evidence, not the production provider
- Vercel production deployment: READY on `main` commit `714aff0f7f4c65ad122c53ab0d9ce118775672b8`
- Vercel PR preview deployment: READY on PR #39 commit `bf0aa79e25e3c501e2c97803fa33640eee7a0e76`
- Vercel exact-head release evidence: OPEN because PR #39 currently points to `a6302596cd017d2d7858acaa1c96739d259cd4a0`
- Supabase Security Advisor: OPEN — 9 intentional authenticated `SECURITY DEFINER` RPC warnings plus leaked-password protection disabled
- The affected RPCs already use explicit `search_path` settings and server-side authorization checks; no blind EXECUTE revocation was applied because that could break required browser RPC calls
- Leaked Password Protection: OPEN — requires Auth configuration action
- Production Smoke Gate: PASS on run `31995477255` for commit `a6302596cd017d2d7858acaa1c96739d259cd4a0`; both deterministic source smoke and live production-shell checks succeeded
- Browser E2E Gate: PASS on run `31995477240` for commit `a6302596cd017d2d7858acaa1c96739d259cd4a0`; the checked-out PR code passed the Playwright browser suite
- Check-in reconciliation: OPEN — one historical `in_progress` booking has no `checked_in_at`; do not mutate it automatically

### Master phases
- Phase 1 Infrastructure: READY
- Phase 2 Security / RLS: HARDENED; Auth and SECURITY DEFINER advisory items remain OPEN
- Phase 3 Patient 360: CONTRACT/E2E GATES PASS; production feature release remains subject to the current PR/release decision
- Phase 4 Scheduling: CONTRACT GATE PASS; authenticated browser gate remains required before phase closure
- Phase 5 Check-in: CONTRACT GATE PASS; authenticated browser/production evidence remains required before full phase closure
- Phase 6 Doctor Clinical Workspace: CONTRACT GATE PASS; authenticated browser/production evidence remains required before full phase closure
- Phase 7 Assessment: CONTRACT GATE PASS; authenticated browser/production evidence remains required before full phase closure
- Phase 8 Billing / Payments: BACKEND HARDENING COMPLETE; fresh browser/production evidence pending
- Phase 9 Refund Approval: CORE CONTROL PASS; full runtime phase gate pending
- Phase 10 Cashier / Finance: NOT STARTED as a phase gate
- Phase 11 AI: NOT STARTED as a phase gate
- Phase 12 Full Security Audit: CONTRACT PASS; independent repository audit still required
- Phase 13 Production QA: IN PROGRESS — production smoke and PR-code browser E2E now have fresh passing evidence; full release-commit and critical workflow verification remain open

## Phase 8 Billing evidence contract

The Phase 8 gate requires evidence for:

- authenticated staff boundary
- payment permission enforcement
- positive payment amount validation
- allowed payment method validation
- invoice row locking before payment creation
- prevention of payment totals exceeding invoice balance
- canonical invoice-status recalculation
- anonymous execution denied for internal payment RPCs
- internal invoice-status recalculation not exposed to authenticated clients
- server-side payment verification

The gate is evidence-only and must not insert, update, delete, or reconcile real patient, invoice, payment, or refund records during CI.

## Delivery rule

Do not claim the entire AZAAD system is production-complete while a required gate remains open. Work may continue through the next bounded gate, but completion status must remain evidence-based.
