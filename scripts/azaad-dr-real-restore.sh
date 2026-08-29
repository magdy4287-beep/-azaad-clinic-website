#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${NEON_DATABASE_URL:?Missing NEON_DATABASE_URL secret}"
: "${DR_BACKUP_PASSPHRASE:?Missing DR_BACKUP_PASSPHRASE secret}"

command -v pg_dump >/dev/null
command -v pg_restore >/dev/null
command -v psql >/dev/null
command -v sha256sum >/dev/null
command -v openssl >/dev/null
command -v awk >/dev/null

work="${RUNNER_TEMP}/azaad-dr"
rm -rf "$work"
mkdir -p "$work"
chmod 700 "$work"
trap 'rm -rf "$work"' EXIT

export PGSSLMODE=require

# Capture a portable public-domain snapshot. Supabase Auth identities are deliberately
# excluded from the portable data plane and are qualified separately.
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file="$work/public.dump"

sha256sum "$work/public.dump" | tee "$work/public.dump.sha256"

# Encrypt the snapshot for ephemeral transport/storage. The passphrase is supplied only
# through the runner secret and is never printed or persisted to Git.
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -pass env:DR_BACKUP_PASSPHRASE \
  -in "$work/public.dump" \
  -out "$work/public.dump.enc"

sha256sum "$work/public.dump.enc" | tee "$work/public.dump.enc.sha256"

# Decrypt into an ephemeral file and prove the original checksum before touching DR.
openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass env:DR_BACKUP_PASSPHRASE \
  -in "$work/public.dump.enc" \
  -out "$work/public.restore.dump"

sha256sum -c "$work/public.dump.sha256" --ignore-missing
cmp "$work/public.dump" "$work/public.restore.dump"

# Supabase public objects can contain FK/RLS references to provider-owned auth roles and
# auth.users. Neon does not provide those Supabase-owned objects. Create a minimal explicit
# compatibility boundary so portable schema objects can be restored without importing
# identities. Identity equivalence is NOT claimed by this step.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid NOT NULL PRIMARY KEY
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END $$;
SQL

# This is a destructive DR-target operation by design. The public schema is replaced as a
# whole so existing FK relationships cannot block DROP TABLE during restore. Supabase auth
# compatibility objects live outside public and are retained.
# IMPORTANT: do not recreate public here. The dump's pre-data section owns CREATE SCHEMA public;
# recreating it manually would make pg_restore fail on a duplicate schema definition.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
SQL

# Restore in phases. Foreign keys are post-data objects. Because Supabase Auth rows are
# intentionally not exported, FK constraints targeting auth.users cannot be truthfully
# recreated in Neon. Pre-data and data are strict; no blanket ignore-errors behavior is used.
pg_restore \
  --exit-on-error \
  --no-owner --no-privileges \
  --section=pre-data \
  --dbname="$NEON_DATABASE_URL" \
  "$work/public.restore.dump"

pg_restore \
  --exit-on-error \
  --no-owner --no-privileges \
  --section=data \
  --dbname="$NEON_DATABASE_URL" \
  "$work/public.restore.dump"

# Extract post-data SQL, then remove ONLY statements that define FK constraints against the
# deliberately absent Supabase auth identity plane. Everything else remains fail-closed.
pg_restore \
  --no-owner --no-privileges \
  --section=post-data \
  --file="$work/post-data.sql" \
  "$work/public.restore.dump"

awk 'BEGIN { RS=";"; ORS=";\n" } !/REFERENCES[[:space:]]+auth\.users[[:space:]]*\(/' \
  "$work/post-data.sql" > "$work/post-data.portable.sql"

psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f "$work/post-data.portable.sql"

# Reconcile counts without emitting row contents to logs.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.azaad_dr_reconciliation (
  checked_at timestamptz NOT NULL DEFAULT now(),
  table_name text NOT NULL,
  row_count bigint NOT NULL,
  PRIMARY KEY (checked_at, table_name)
);

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'azaad_dr_reconciliation' ORDER BY tablename LOOP
    EXECUTE format(
      'INSERT INTO public.azaad_dr_reconciliation (table_name, row_count) SELECT %L, count(*) FROM public.%I',
      r.tablename,
      r.tablename
    );
  END LOOP;
END $$;
SQL

echo "PASS: encrypted portable public-schema export"
echo "PASS: SHA-256 integrity verification"
echo "PASS: Neon compatibility boundary initialized"
echo "PASS: clean public-schema replacement completed"
echo "PASS: portable pre-data and data restore completed"
echo "PASS: portable post-data restore completed"
echo "PASS: reconciliation metadata recorded"
echo "NOT PROVEN: identity/auth portability"
echo "NOT PROVEN: FK equivalence for Supabase auth.users references"
echo "NOT PROVEN: RLS/RPC/Edge Function behavioral equivalence"
echo "NOT PROVEN: production cutover"
