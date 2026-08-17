# AZAAD Phase 12 — Full Security Audit Gate

## Fresh Supabase evidence baseline

Verified directly against the production Supabase project on 2026-08-17:

- The inspected SECURITY DEFINER functions have explicit `search_path` configuration.
- Internal SECURITY DEFINER helpers/triggers are not executable by `anon` or `public`.
- A small set of authenticated SECURITY DEFINER RPCs is intentionally exposed to the application for check-in, invoice lookup, payment, clinical visit start, and refund approval/processing actions; these functions perform explicit active-staff/role/permission checks and refund approver separation checks.
- RLS is enabled across the inspected public application tables and each inspected RLS-enabled table has an intentional policy posture.
- Sensitive clinical/financial/admin tables are protected by RLS and/or server-side authorization boundaries. Table grants alone are not treated as authorization because RLS is enforced for client roles.
- Refund processing remains server-enforced: Doctor approval is required first, then Management/Owner approval, and processing requires both approvals. Requester/approver separation is enforced.
- Payment authorization and invoice-balance protections remain server-enforced.
- AI remains assistive and has no approval authority in the refund workflow.
- Five missing foreign-key covering indexes identified by the Supabase performance advisor were added by migration `azaad_core_stack_performance_fk_indexes`.

## Audit gate requirements

- no SECURITY DEFINER function without explicit search_path
- no unintended anon/public execution of internal SECURITY DEFINER functions
- every RLS-enabled public table has an intentional policy posture
- sensitive clinical/financial/admin tables are protected by RLS and/or server-side boundaries
- refund approval hierarchy remains server-enforced
- payment authorization and balance protections remain server-enforced
- AI remains assistive and cannot bypass authorization
- performance-critical missing foreign-key indexes are addressed or explicitly accepted
- existing regression and production browser gates remain green

## External-platform verification

This file does not claim that Supabase dashboard-only settings are verified through database evidence. Leaked-password protection remains a dashboard-level verification item before final production sign-off.

This is an evidence contract, not a substitute for fresh CI, browser, deployment, or dashboard evidence.
