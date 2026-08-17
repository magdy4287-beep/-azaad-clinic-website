# AZAAD Phase 12 — Full Security Audit Gate

## Security evidence contract

Required controls before Phase 12 can be closed:

- every SECURITY DEFINER function has an explicit `search_path`
- no internal security/trigger RPC is executable by `public`, `anon`, or `authenticated` unless explicitly intended
- RLS is enabled on protected tables
- RLS tables with no business-facing policies have an explicit restrictive deny posture
- sensitive clinical and financial tables are not directly readable by anonymous clients
- refund approval hierarchy is enforced server-side
- payment over-balance protection is enforced server-side
- AI cannot bypass clinical/financial authorization
- GitHub workflows use least-privilege permissions and do not expose secrets
- frontend authorization is not trusted as the security boundary

## Evidence rule

This is a contract gate. It must not claim a full security audit or production readiness without fresh CI evidence and production/browser evidence.

## Data safety

CI must not mutate real patient, clinical, invoice, payment, refund, cashier, or finance records.
