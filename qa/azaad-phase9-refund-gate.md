# AZAAD Phase 9 — Refund Approval Gate

## Production database evidence

Verified directly in Supabase before defining this gate:

- Doctor approval requires an active Doctor and assigned-doctor scope.
- Requester cannot approve their own refund.
- Management/Owner approval requires prior Doctor approval.
- Management/Owner approver must differ from requester and Doctor approver.
- Bank refunds require active ADMIN/OWNER approval.
- Refund processing requires authorized CASHIER/ACCOUNTANT/ADMIN/OWNER staff.
- Processing requires both Doctor and Management/Owner approvals.
- A refund cannot be processed twice.
- Approval/processing actions write audit records.
- Trigger functions that enforce the hierarchy are not executable by PUBLIC/anon/authenticated clients.
- `process_refund` remains server-side guarded even though authenticated execution exists.

## Evidence boundary

This contract does not claim browser E2E success. Fresh CI and browser evidence are required before Phase 9 is fully closed.

## Data safety

CI must not create, approve, reject, or process a real refund. No production refund row is used as a test fixture.
