# Azaad Clinic Integration Gate

Purpose: define the non-destructive acceptance contract for the existing Patient → Scheduling → Front Desk → Billing → Doctor workflow.

## Scope

This is a verification contract, not a second implementation. Existing production tables, RPCs, statuses, and central I18N remain the source of truth.

## Required scenarios

1. Patient booking uses the existing scheduling/mutation boundary and only real available slots.
2. The same appointment is visible to Patient/Admin/Front Desk/Doctor; no duplicate appointment is created for early or late arrival.
3. Early arrival and late arrival can be checked in according to the existing appointment workflow.
4. No-show remains recoverable according to the existing status contract when the patient later arrives; cancelled appointments are not silently converted into normal check-ins.
5. Check-in leads to the existing invoice/payment/close flow. Payment state is decided server-side; UI state alone cannot mark an invoice paid.
6. After the invoice/payment gate succeeds, the existing workflow makes the appointment eligible for the doctor queue.
7. Doctor A cannot read or mutate Doctor B's appointments/patients by changing request parameters; authorization must hold at the backend/RLS boundary.
8. Statuses remain canonical database values and are translated only through Central I18N.
9. Dynamic patient, doctor, specialty, appointment, invoice, payment, status, date, and time text follows the selected locale without mixed-language output or page instability.
10. All user-facing appointment times use the project's 12-hour display convention (AM/PM or localized equivalent), while database timestamps remain canonical.

## Safety

- Do not use production patient/payment records as test fixtures.
- Prefer isolated test identities and disposable appointments.
- Do not weaken RLS or grant broad EXECUTE permissions merely to make a test pass.
- A green build is not evidence that the end-to-end scenarios passed.

## Exit criteria

The gate is PASS only when each scenario has fresh executable evidence. Until then, the corresponding item remains UNPROVEN rather than being marked green by assumption.
