# AZAAD — Emergency DR Execution Status — 2026-08-29

**AI-First • Free-Only • Safety-Gated • Fail-Closed**

## Candidate

- Application candidate SHA: `c4890e818864a83764816e4b5643dd9e04657aea`
- Emergency execution branch: `codex/azaad-emergency-dr-execution`
- Emergency execution candidate SHA: `bacd6e862b4435fbfdb7adc0a1849a18610f89c1`
- Supabase primary project: `derofsthjivlkcdnojww`
- Supabase status at inventory time: `ACTIVE_HEALTHY`
- Supabase PostgreSQL: `17.6.1.155`
- Supabase region: `eu-central-1`
- Neon DR candidate: `icy-heart-97740587`
- Neon database: `neondb`
- Neon production branch: `br-aged-dream-axdwdfo4`

## Source inventory completed

The emergency inventory was read directly from the Supabase project and cross-checked against the repository portability contract.

Verified source domains include:

- Patient and identity bindings
- Doctors and staff
- Central bookings and scheduling
- Clinical visits and assessment engine
- Invoices, payments, refunds, and financial controls
- Audit logs and audit events
- RBAC action catalog and permission scopes
- Workflow definitions and instances
- AI insights, recommendations, and usage events
- Marketing/content data
- Media metadata and storage references
- RLS-enabled public tables
- Supabase migrations
- Supabase Edge Functions

## Safety decisions

- No Supabase production schema was changed by the emergency DR work.
- No Supabase production data was deleted.
- No production provider cutover occurred.
- No plaintext passwords, service-role keys, or database credentials are committed.
- Auth identity portability remains a separate gate; passwords must never be exported as plaintext.
- RLS/RBAC, RPC, Edge Function, storage, and browser equivalence remain fail-closed until fresh evidence exists.

## Automation added

The emergency branch contains:

- `scripts/azaad-dr-real-restore.sh`
- `.github/workflows/azaad-emergency-dr-restore.yml`

The runner is designed to:

1. Require `SUPABASE_DB_URL`, `NEON_DATABASE_URL`, and `DR_BACKUP_PASSPHRASE` as GitHub Actions secrets.
2. Export the portable `public` PostgreSQL surface.
3. Calculate SHA-256 integrity evidence.
4. Encrypt the ephemeral backup with the runner-only passphrase.
5. Decrypt and verify the original checksum before restore.
6. Restore to the Neon PostgreSQL target.
7. Record non-sensitive reconciliation metadata.
8. Explicitly leave identity/auth, authorization/RLS, RPC/Edge Function behavior, and production cutover as `NOT PROVEN` until their dedicated gates pass.

No backup artifact is committed to Git.

## Current blocking gates

`NOT PROVEN ON FREE-ONLY STACK`

Blocking items:

1. Neon execution connector currently rejects the documented project/branch argument contract before SQL execution. No Neon SQL mutation was performed through the connector.
2. The repository runner requires the three emergency secrets to exist in GitHub Actions before a real restore can execute.
3. Neon Auth/identity mapping is not yet certified against AZAAD's existing `auth_user_id` contracts.
4. AZAAD RLS/RBAC and SECURITY DEFINER behavior is not yet proven equivalent on the destination.
5. Supabase Edge Functions have not yet been rehosted/verified on the destination runtime.
6. Storage object migration and checksum reconciliation have not yet been proven.
7. Browser/clinical/financial E2E against the DR candidate has not yet passed.
8. Production cutover remains blocked.

## Certification rule

Do not label the DR environment `CERTIFIED` until the exact candidate SHA, destination data snapshot, identity mapping, authorization/security behavior, storage reconciliation, clinical/financial UAT, and production/browser E2E all have fresh evidence.
