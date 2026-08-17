# AZAAD Phase 12 — Full Security Audit Gate

## Fresh Supabase evidence baseline

Verified directly against the production Supabase project:

- SECURITY DEFINER functions have an explicit `search_path` configuration.
- Internal SECURITY DEFINER RPCs/triggers are not executable by `anon` or `public`.
- Sensitive finance and refund internals are not directly exposed to `anon`/`authenticated`.
- Tables previously flagged as RLS-enabled with zero policies now have explicit restrictive deny policies for `anon`/`authenticated`.
- Direct grants on sensitive admin/finance tables were revoked where the application already relies on server-side boundaries.

## Audit gate requirements

- no SECURITY DEFINER function without explicit search_path
- no unintended anon/public execution of internal SECURITY DEFINER functions
- every RLS-enabled public table has an intentional policy posture
- sensitive clinical/financial/admin tables are not directly exposed to client roles
- refund approval hierarchy remains server-enforced
- payment authorization and balance protections remain server-enforced
- AI remains assistive and cannot bypass authorization
- existing regression and production browser gates remain green

This is an evidence contract, not a claim that every external platform setting (for example Auth dashboard configuration) has been independently verified. Production completion requires fresh CI and platform-specific evidence.
