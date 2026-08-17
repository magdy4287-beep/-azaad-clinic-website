# AZAAD Engineering Control Plan — Core Stack & Production Gates

## Purpose

This document is the operating contract for production work on AZAAD Clinic. A feature is not considered complete because code exists or a commit was created. It is complete only when the relevant gates have fresh evidence.

## Core pipeline

```text
GitHub
  ↓
Vercel
  ↓
Supabase
  ↓
AZAAD
```

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

A phase is DONE only when its applicable source, backend, frontend, security, integration, E2E and production gates have fresh evidence. A passing static contract alone does not close a runtime gate.

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

### 3. Vercel
- A GitHub commit is not production proof.
- Production gate requires a READY deployment, HTTP success, and runtime-error review.
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

### Gate C — Frontend
- [ ] Intended screen renders.
- [ ] Target action is visible to the correct role.
- [ ] Unauthorized role cannot perform the action.
- [ ] Arabic/English behavior verified when affected.
- [ ] Responsive behavior verified when affected.
- [ ] Console/runtime errors reviewed.

### Gate D — Production
- [ ] Deployment READY.
- [ ] Production URL returns successfully.
- [ ] Runtime error/fatal logs reviewed.
- [ ] Critical workflow smoke test completed.

### Gate E — Completion
A gate may be marked DONE only from fresh evidence. Static plausibility, a successful commit, or a planned test is not evidence of runtime success.

## Current AZAAD status — 2026-08-17

### Infrastructure / Security
- Core architecture: READY
- Refund hierarchy: READY and enforced server-side
- Refund Edge workflow: deployed and JWT-protected
- Supabase RLS hardening: active
- Vercel production: READY
- Production HTTP smoke: PASS
- Production error review: PASS for the checked window
- Clinical Assessment backend/RLS: READY for E2E validation
- Check-in reconciliation: OPEN — one historical `in_progress` booking has no `checked_in_at`; do not mutate it automatically
- Leaked Password Protection: OPEN — requires Auth configuration action
- Authenticated SECURITY DEFINER advisory items: OPEN — review deliberately; do not remove legitimate protected operations just to silence an advisory

### Master phases
- Phase 1 Infrastructure: READY
- Phase 2 Security / RLS: HARDENED; final advisory/Auth items remain OPEN
- Phase 3 Patient 360: CONTRACT/E2E GATES PASS; production feature release remains subject to the current PR/release decision
- Phase 4 Scheduling: CONTRACT GATE PASS; authenticated browser gate is the next required evidence before phase closure
- Phase 5 Check-in: NOT STARTED as a phase gate
- Phase 6 Doctor Clinical Workspace: NOT STARTED as a phase gate
- Phase 7 Assessment: NOT STARTED as a phase gate
- Phase 8 Billing / Payments: NOT STARTED as a phase gate
- Phase 9 Refund Approval: CORE CONTROL READY; full phase gate pending later
- Phase 10 Cashier / Finance: NOT STARTED as a phase gate
- Phase 11 AI: NOT STARTED as a phase gate
- Phase 12 Full Security Audit: NOT STARTED
- Phase 13 Production QA: NOT STARTED

## Delivery rule

Do not claim the entire AZAAD system is production-complete while a required gate remains open. Work may continue through the next bounded gate, but completion status must remain evidence-based.
