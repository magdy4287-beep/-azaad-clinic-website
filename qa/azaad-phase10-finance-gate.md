# AZAAD Phase 10 — Cashier / Finance Gate

## Production database evidence baseline

Verified finance objects in Supabase include:

- `clinic_staff_shifts`
- `clinic_expenses`
- `clinic_daily_closings`
- `clinic_finance_period_kpis`

Current exposure controls verified during Phase 10 discovery:

- `clinic_staff_shifts`: no direct SELECT for anon/authenticated
- `clinic_expenses`: no direct SELECT for anon/authenticated
- `clinic_daily_closings`: no direct SELECT for anon/authenticated
- `clinic_finance_period_kpis`: direct SELECT revoked from public/anon/authenticated
- `enforce_expense_immutability()`: EXECUTE revoked from public/anon/authenticated because it is an internal trigger function

## Gate requirements

The full Finance phase requires fresh evidence for:

1. cashier/finance authentication and role authorization
2. shift open/close lifecycle
3. collection reconciliation
4. expense authorization and immutability
5. daily closing authorization
6. variance calculation and audit trail
7. finance KPI access only through an authorized server boundary
8. no direct client exposure of internal finance tables/functions
9. no real patient/financial mutations in CI

This document is not a claim of full Phase 10 completion. Browser and production E2E evidence remain required.
