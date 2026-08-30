#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${NEON_DATABASE_URL:?Missing NEON_DATABASE_URL secret}"
: "${DR_BACKUP_PASSPHRASE:?Missing DR_BACKUP_PASSPHRASE secret}"

export PATH="/usr/lib/postgresql/17/bin:$PATH"
export PGSSLMODE=require

for cmd in pg_dump pg_restore psql sha256sum openssl cmp awk; do
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

# External dependencies required by the public-schema archive are prepared first.
# Security compatibility helpers are deliberately fail-closed. They exist only
# so restored RLS definitions can be created; they are not authorization logic.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS security;
CREATE TABLE IF NOT EXISTS auth.users (id uuid NOT NULL PRIMARY KEY);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user)::text;
$$;

CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.email', true), '')::text;
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
END $$;

CREATE OR REPLACE FUNCTION security.can_access_patient(patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT false;
$$;

CREATE OR REPLACE FUNCTION security.can_access_patient_clinical(patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT false;
$$;

REVOKE ALL ON FUNCTION security.can_access_patient(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION security.can_access_patient_clinical(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_access_patient(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION security.can_access_patient_clinical(uuid) TO authenticated;
SQL

# Neon already has the standard public schema. Do NOT drop it with CASCADE:
# that could destroy unrelated target objects. Instead, use a pg_restore list
# that excludes only the archive's CREATE SCHEMA public entry. The remainder of
# the archive is restored into the existing public schema.
awk '!($0 ~ /SCHEMA - public$/)' "$work/restored-archive.list" > "$work/restore.list"
test -s "$work/restore.list"

pg_restore --exit-on-error --no-owner --no-privileges \
  --use-list="$work/restore.list" \
  --section=pre-data \
  --dbname="$NEON_DATABASE_URL" \
  "$work/public.restore.dump"

pg_restore --exit-on-error --no-owner --no-privileges \
  --use-list="$work/restore.list" \
  --section=data \
  --disable-triggers \
  --dbname="$NEON_DATABASE_URL" \
  "$work/public.restore.dump"

# Materialize every likely auth identity referenced by restored public data before
# post-data creates foreign keys. This is metadata-driven, not table-name-driven.
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
      r.column_name, r.table_schema, r.table_name, r.column_name
    );
  END LOOP;
END $$;
SQL

pg_restore --exit-on-error --no-owner --no-privileges \
  --use-list="$work/restore.list" \
  --section=post-data \
  --dbname="$NEON_DATABASE_URL" \
  "$work/public.restore.dump"

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
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname='public' AND tablename <> 'azaad_dr_reconciliation'
    ORDER BY tablename
  LOOP
    EXECUTE format(
      'INSERT INTO public.azaad_dr_reconciliation (table_name, row_count)
       SELECT %L, count(*) FROM public.%I',
      r.tablename, r.tablename
    );
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION security.can_access_patient(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION security.can_access_patient_clinical(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_access_patient(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION security.can_access_patient_clinical(uuid) TO authenticated;
SQL

cp "$work/public.dump.enc" "$evidence/public.dump.enc"
cp "$work/public.dump.enc.sha256" "$evidence/public.dump.enc.sha256"
cat > "$evidence/README.txt" <<'EOF'
AZAAD Emergency DR encrypted recovery artifact.

The archive is encrypted with the controlled DR passphrase stored in GitHub
Actions secrets. The plaintext dump is intentionally not preserved.

The target Neon public schema is preserved. Only the archive's CREATE SCHEMA
public entry is excluded from pg_restore; tables, data, indexes, constraints,
triggers and other archived objects are still restored.

Referenced identity UUIDs are materialized as minimal auth.users placeholders
only to satisfy referential integrity during disaster recovery. This is not a
restoration of Supabase Auth credentials or sessions.

auth.uid/auth.role/auth.email/auth.jwt are compatibility helpers required to
restore Supabase RLS definitions. They are not a production authorization
implementation; identity and authorization portability must be certified
separately before production cutover.

security.can_access_patient and security.can_access_patient_clinical are
fail-closed compatibility dependencies used only while restoring RLS definitions.
They return false and are NOT authorization implementations. RLS/RPC/Edge Function
behavioral portability must be certified separately before production cutover.
EOF
chmod 600 "$evidence/public.dump.enc" "$evidence/public.dump.enc.sha256" "$evidence/README.txt"

echo 'PASS: PostgreSQL archive toolchain available'
echo 'PASS: custom dump validated with pg_restore --list'
echo 'PASS: encrypted snapshot integrity verified'
echo 'PASS: decrypted archive revalidated'
echo 'PASS: auth and security external dependencies initialized'
echo 'PASS: Supabase auth helper signatures initialized'
echo 'PASS: security.can_access_patient helper initialized fail-closed'
echo 'PASS: security.can_access_patient_clinical helper initialized fail-closed'
echo 'PASS: existing Neon public schema preserved'
echo 'PASS: archive public-schema creation entry excluded'
echo 'PASS: strict pre-data restore completed'
echo 'PASS: strict data restore completed'
echo 'PASS: dynamic identity-reference placeholders materialized'
echo 'PASS: strict post-data restore completed'
