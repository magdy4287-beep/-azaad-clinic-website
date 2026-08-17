# AZAAD Phase 8 — Billing / Payments Gate

## Verified production database boundary

The Phase 8 backend boundary was verified directly against the AZAAD Supabase project before this gate was defined.

Required controls:

- authenticated staff boundary
- payment permission enforcement
- positive payment amount validation
- allowed payment method validation
- invoice row locking before payment creation
- prevention of payment totals exceeding invoice balance
- canonical invoice-status recalculation
- anonymous execution denied for internal payment RPCs
- internal invoice-status recalculation not exposed to authenticated clients
- payment verification remains server-side

## Evidence rule

This file is a contract/evidence checklist only. It does not claim browser or production E2E success. Those require fresh CI/browser evidence.

## Data safety

The gate must not insert, update, delete, or reconcile real patient, invoice, payment, or refund records during CI.
