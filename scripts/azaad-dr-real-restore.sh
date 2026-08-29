#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${NEON_DATABASE_URL:?Missing NEON_DATABASE_URL secret}"
: "${DR_BACKUP_PASSPHRASE:?Missing DR_BACKUP_PASSPHRASE secret}"

export PATH="/usr/lib/postgresql/17/bin:$PATH"
export PGSSLMODE=require

for cmd in pg_dump pg_restore psql sha256sum openssl cmp; do
  command -v "$cmd" >/dev/null || { echo "ERROR: required command not found: $cmd" >&2; exit 127; }
done

work="${RUNNER_TEMP}/azaad-dr"
evidence="${RUNNER_TEMP}/azaad-dr-evidence"
rm -rf "$work" "$evidence"
mkdir -p "$work" "$evidence"
chmod 700 "$work" "$evidence"
trap 'rm -rf "$work"' EXIT

pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file="$work/public.dump"

pg_restore --list "$work/public.dump" > "$work/archive.list"
test -s "$work/archive.list"
sha256sum "$work/public.dump" | tee "$work/public.dump.sha256"

openssl enc -aes-256-cbc -pbkdf2 -salt \
  -pass env:DR_BACKUP_PASSPHRASE \
  -in "$work/public.dump" \
  -out "$work/public.dump.enc"
sha256sum "$work/public.dump.enc" | tee "$work/public.dump.enc.sha256"

openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass env:DR_BACKUP_PASSPHRASE \
  -in "$work/public.dump.enc" \
  -out "$work/public.restore.dump"
sha256sum -c "$work/public.dump.sha256" --ignore-missing
cmp "$work/public.dump" "$work/public.restore.dump"
pg_restore --list "$work/public.restore.dump" > "$work/restored-archive.list"
test -s "$work/restored-archive.list"

# The restore target is intentionally prepared with only the minimal external
# Supabase identity boundary. The security helper below is a FAIL-CLOSED
# dependency stub: it exists only so post-data RLS policies can be created.
# It is never treated as proof of authorization portability and is explicitly
# replaced/validated in the later security-certification gate.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS security;
CREATE TABLE IF NOT EXISTS auth.users (id uuid NOT NULL PRIMARY KEY);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
END $$;

-- Fail-closed compatibility dependency for restored RLS policy creation.
-- This MUST NOT grant clinical access during DR restore.
CREATE OR REPLACE FUNCTION security.can_access_patient_clinical(patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT false;
$$;

REVOKE ALL ON FUNCTION security.can_access_patient_clinical(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_access_patient_clinical(uuid) TO authenticated;
SQL

psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'

pg_restore --exit-on-error --no-owner --no-privileges --section=pre-data --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"
pg_restore --exit-on-error --no-owner --no-privileges --section=data --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"

# The FK definitions live in pg_restore's post-data section. Before that section is
# restored, discover likely identity-reference UUID columns from the restored schema
# and materialize minimal auth.users placeholder identities. This is deliberately
# driven by schema metadata rather than hard-coded table names.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'uuid'
      AND (
        column_name = 'auth_user_id'
        OR column_name = 'user_id'
        OR column_name LIKE '%_user_id'
        OR column_name IN ('created_by', 'updated_by', 'approved_by', 'verified_by', 'cancelled_by', 'completed_by', 'checked_in_by', 'checked_out_by')
      )
    ORDER BY table_schema, table_name, column_name
  LOOP
    EXECUTE format(
      'INSERT INTO auth.users (id)
       SELECT DISTINCT %I
       FROM %I.%I
       WHERE %I IS NOT NULL
       ON CONFLICT (id) DO NOTHING',
      r.column_name, r.table_schema, r.table_name,
      r.column_name
    );
  END LOOP;
END $$;
SQL

pg_restore --exit-on-error --no-owner --no-privileges --section=post-data --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"

# The restored archive is now structurally complete. Reassert the DR security
# boundary explicitly: the compatibility function is not an authorization proof.
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
    EXECUTE format('INSERT INTO public.azaad_dr_reconciliation (table_name, row_count) SELECT %L, count(*) FROM public.%I', r.tablename, r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION security.can_access_patient_clinical(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_access_patient_clinical(uuid) TO authenticated;
SQL

cp "$work/public.dump.enc" "$evidence/public.dump.enc"
cp "$work/public.dump.enc.sha256" "$evidence/public.dump.enc.sha256"
cat > "$evidence/README.txt" <<'EOF'
AZAAD Emergency DR encrypted recovery artifact.

The archive is encrypted with the controlled DR passphrase stored in GitHub
Actions secrets. The plaintext dump is intentionally not preserved.

Referenced identity UUIDs are materialized as minimal auth.users placeholders
only to satisfy referential integrity during disaster recovery. This must not
be interpreted as restoration of Supabase Auth credentials or sessions.

The security.can_access_patient_clinical function is a fail-closed compatibility
stub used only to permit restoration of RLS policy definitions. It returns false
and is NOT an authorization implementation. RLS/RPC/Edge Function behavioral
portability must be certified separately before any production cutover.
EOF
chmod 600 "$evidence/public.dump.enc" "$evidence/public.dump.enc.sha256" "$evidence/README.txt"

echo 'PASS: PostgreSQL 17 archive toolchain'
echo 'PASS: custom dump validated with pg_restore --list'
echo 'PASS: encrypted snapshot integrity verified'
echo 'PASS: decrypted archive revalidated'
echo 'PASS: Neon compatibility boundary initialized'
echo 'PASS: auth and security dependency boundaries initialized'
echo 'PASS: clean public-schema replacement completed'
echo 'PASS: strict pre-data and data restore completed'
echo 'PASS: dynamic identity-reference placeholders materialized before FK creation'
echo 'PASS: strict post-data restore completed directly from custom archive'
echo 'PASS: reconciliation metadata recorded'
echo 'PASS: encrypted recovery artifact staged for retention'
echo 'NOT PROVEN: identity/auth portability'
echo 'NOT PROVEN: RLS/RPC/Edge Function behavioral equivalence'
echo 'NOT PROVEN: production cutover'
