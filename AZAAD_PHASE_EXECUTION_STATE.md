# AZAAD — Phase Execution State

## Master order

1. Infrastructure
2. Security / RLS
3. Patient 360
4. Scheduling
5. Check-in
6. Doctor Clinical Workspace
7. Assessment
8. Billing / Payments
9. Refund Approval
10. Cashier / Finance
11. AI
12. Full Security Audit
13. Production QA

## Current execution

### Phase 1 — Infrastructure
- Status: PASS / established baseline
- GitHub → Vercel → Supabase path verified.
- Production deployment evidence must be fresh for each release gate.

### Phase 2 — Security / RLS
- Status: HARDENED / final audit items remain
- SECURITY DEFINER search_path hardening applied.
- Internal RPC execution lockdown applied.
- Core clinical/financial RLS hardened.
- Refund approval hierarchy is non-negotiable: Doctor Approval → Management/Owner Approval → Finance Processing.
- AI cannot approve refunds.

### Phase 3 — Patient 360
- Status: GATE READY / targeted production-safe browser evidence remains before final DONE.
- Patient 360 contract and financial integration gates pass on the current control-plan lineage.
- Doctor Isolation Contract passes against the real server-side authorization boundary.
- Production Browser E2E is passing on the current PR lineage.
- No patient data is created or mutated by static/contract gates.

### Phase 4 — Scheduling
- Status: ACTIVE / contract gate PASS
- Canonical central scheduling contract exists with normalized statuses, slot validation, date normalization and doctor-scope validation.
- Central scheduling center is a side-effect-free read/compose layer; mutations remain behind backend-owned action boundaries.
- Scheduling actions contract covers booking, rescheduling, cancellation, no-show, transfer and waiting-list assignment with role and doctor-scope authorization.
- Appointment Contract Gate passes on the current control-plan commit.
- New Phase 4 Scheduling Gate passes on the current control-plan commit.
- Next acceptance work: authenticated browser verification of the scheduling UI (day/week/month, doctor rows, availability, booking/reschedule/cancel/waiting-list flows) without mutating production patient data.

### Blocking finding resolved in this control-plan branch
The Doctor Isolation Contract Gate previously asserted a local `cache.filter` implementation detail that the current architecture intentionally does not use. The actual doctor isolation boundary is server-side in `azaad-doctor-dashboard`: the authenticated user is resolved to an active DOCTOR staff record, the doctor_id is derived server-side, bookings are filtered with `doctor_id = authenticated doctor.id`, and waiting-list rows are scoped to that doctor. The contract gate now verifies those server-side invariants instead of requiring a client-side filter.

## Non-negotiable completion rule
A phase is DONE only after UI → Auth → Authorization → Backend/DB → Validation → Audit/Security → Error handling → Arabic/English → Responsive behavior → E2E verification → production verification are evidenced.

## Data safety
Static gates and contract checks must not create, mutate, delete, or fabricate patient, clinical, payment, or refund records.
