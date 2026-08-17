# AZAAD Phase 8 — Billing / Payments Evidence

Status: **Backend security/integrity gate verified; browser/CI evidence pending**.

Date: 2026-08-17

## Direct Supabase evidence

The production Supabase project was inspected directly for the canonical billing/payment boundaries.

Verified functions:

- `clinic_record_payment`
- `clinic_verify_payment`
- `clinic_get_invoice_for_booking`
- `clinic_recalculate_invoice_status`

Observed controls:

- Payment recording requires the `payment` permission.
- Payment recording requires an active staff session.
- Payment amount must be positive.
- Payment method is allow-listed.
- Invoice row is locked with `FOR UPDATE` before recording.
- Recorded non-rejected payments are checked against the invoice total before insertion.
- Bank transfers are created as `pending` and require verification before becoming verified.
- Invoice status is recalculated from verified payments.
- Payment verification requires `payment_verify` permission and locks the payment row.
- Anonymous EXECUTE is denied for the canonical payment/invoice RPCs.
- Internal recalculation RPC is not directly executable by `anon` or `authenticated`.
- Payment core fields are protected by the database immutability trigger.
- Payment validation rejects invalid amounts, invoice-not-found, patient mismatch, and verified overpayment.

## Change applied

`clinic_record_payment` was hardened to reject a payment when the sum of existing non-rejected payments plus the new amount would exceed the invoice total. The function now also explicitly requires an active staff session, uses `search_path = public, pg_catalog`, and calls the canonical invoice-status recalculation routine after insertion.

No patient, payment, invoice, or refund rows were modified by this migration.

## Gate boundary

This evidence is **not** a claim of full Phase 8 completion. Browser/UI and fresh CI/production evidence are still required before Phase 8 can be marked DONE under the AZAAD Engineering Control Plan.
