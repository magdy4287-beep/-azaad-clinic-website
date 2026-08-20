# AZAAD — Implementation Progress

## Current controlled-evolution gate

PR #58 (`codex/azaad-comprehensive-system-hardening`) remains the active integration gate.

### Root-cause fix completed

The comprehensive contract previously failed because the authenticated role was owned by the admin runtime state but the role-experience shell only consumed `document.body.dataset.role` while the contract incorrectly required the obsolete `admin.js` path to expose it.

The role experience now derives the authenticated role from `window.AZAAD.state.role` when available and projects it into `body`/`html` `data-role` attributes. UI role filtering remains convenience-only; protected operations remain server-authorized.

The contract was updated to validate this real runtime boundary instead of relying on the obsolete source location.

## Active product requirements carried forward

- Central Patient / Appointment / Event Timeline
- Invoice → Payment → Check-in → Doctor workflow gates
- 12-hour patient/admin time presentation
- Server-authoritative timestamps for KPI evidence
- Role + Department + Permission + Scope authorization
- Owner/Management staff lifecycle and password reset controls
- Salary / percentage / hybrid compensation policies
- Procurement + Inventory hybrid operations with governed pricing
- Marketing Studio + channel-provider architecture + approval workflow
- Department AI with human approval gates and free fallback
- Clinical AI assessment provenance, adaptive questions, trends and alerts
- Central Calendar and global authorized search
- Patient ↔ Administration synchronization
- Responsive mobile/tablet/laptop/desktop experience
- Executive Intelligence / Reports and KPI evidence

## Verification rule

No feature is considered production-complete from static code alone. Each affected workflow must pass contract, authorization/RLS, API, browser E2E and production-gate evidence before being promoted.
