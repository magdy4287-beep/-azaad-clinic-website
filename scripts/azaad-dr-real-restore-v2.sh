#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${NEON_DATABASE_URL:?Missing NEON_DATABASE_URL secret}"
: "${DR_BACKUP_PASSPHRASE:?Missing DR_BACKUP_PASSPHRASE secret}"

export PGSSLMODE=require
for cmd in pg_dump pg_restore psql sha256sum openssl cmp; do
  command -v "$cmd" >/dev/null || { echo "ERROR: missing $cmd" >&2; exit 127; }
done

work="${RUNNER_TEMP}/azaad-dr-v2"
evidence="${RUNNER_TEMP}/azaad-dr-v2-evidence"
rm -rf "$work" "$evidence"
mkdir -p "$work" "$evidence"
chmod 700 "$work" "$evidence"
trap 'rm -rf "$work"' EXIT

# Public runtime functions depend on private SECURITY DEFINER helpers. Both
# schemas are therefore part of the authoritative portability artifact.
pg_dump "$SUPABASE_DB_URL" --format=custom --schema=private --schema=public --no-owner --no-privileges --file="$work/runtime.dump"
pg_restore --list "$work/runtime.dump" > "$work/archive.list"
grep -Eq 'SCHEMA[[:space:]]+-[[:space:]]+private' "$work/archive.list"
grep -Eq 'SCHEMA[[:space:]]+-[[:space:]]+public' "$work/archive.list"
grep -Eq 'FUNCTION[[:space:]]+private\\.' "$work/archive.list"
sha256sum "$work/runtime.dump" | tee "$work/runtime.dump.sha256"

openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:DR_BACKUP_PASSPHRASE -in "$work/runtime.dump" -out "$work/runtime.dump.enc"
sha256sum "$work/runtime.dump.enc" | tee "$work/runtime.dump.enc.sha256"
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:DR_BACKUP_PASSPHRASE -in "$work/runtime.dump.enc" -out "$work/runtime.restore.dump"
sha256sum -c "$work/runtime.dump.sha256" --ignore-missing
cmp "$work/runtime.dump" "$work/runtime.restore.dump"
pg_restore --list "$work/runtime.restore.dump" > "$work/restored.list"
grep -Eq 'SCHEMA[[:space:]]+-[[:space:]]+private' "$work/restored.list"
grep -Eq 'SCHEMA[[:space:]]+-[[:space:]]+public' "$work/restored.list"
grep -Eq 'FUNCTION[[:space:]]+private\\.' "$work/restored.list"

# Compatibility only: these helpers let the archived RLS definitions compile.
# They do not provide production authorization.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS security;
CREATE TABLE IF NOT EXISTS auth.users (id uuid NOT NULL PRIMARY KEY);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user)::text;
$$;
CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.email', true), '')::text;
$$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;

CREATE OR REPLACE FUNCTION security.can_access_patient(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false; $$;
CREATE OR REPLACE FUNCTION security.can_access_patient_clinical(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false; $$;
REVOKE ALL ON FUNCTION security.can_access_patient(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION security.can_access_patient_clinical(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_access_patient(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION security.can_access_patient_clinical(uuid) TO authenticated;
SQL

# Never pre-create public/private. The authoritative archive owns their schema
# definitions and dependency ordering.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS private CASCADE; DROP SCHEMA IF EXISTS public CASCADE;'

pg_restore --exit-on-error --no-owner --no-privileges --section=pre-data --dbname="$NEON_DATABASE_URL" "$work/runtime.restore.dump"

psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE private_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='public') THEN RAISE EXCEPTION 'PUBLIC_SCHEMA_MISSING'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='private') THEN RAISE EXCEPTION 'PRIVATE_SCHEMA_MISSING'; END IF;
  SELECT count(*) INTO private_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private';
  IF private_count = 0 THEN RAISE EXCEPTION 'PRIVATE_FUNCTIONS_MISSING'; END IF;
END $$;
SQL

pg_restore --exit-on-error --no-owner --no-privileges --section=data --disable-triggers --dbname="$NEON_DATABASE_URL" "$work/runtime.restore.dump"

# Recreate minimal auth identity rows referenced by restored public data so FK
# creation can succeed. This is UUID metadata only, not credential restoration.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND data_type='uuid'
      AND (column_name='auth_user_id' OR column_name='user_id' OR column_name LIKE '%_user_id'
           OR column_name IN ('created_by','updated_by','approved_by','verified_by','cancelled_by','completed_by','checked_in_by','checked_out_by'))
  LOOP
    EXECUTE format(
      'INSERT INTO auth.users(id) SELECT DISTINCT %I FROM %I.%I WHERE %I IS NOT NULL ON CONFLICT(id) DO NOTHING',
      r.column_name, r.table_schema, r.table_name, r.column_name
    );
  END LOOP;
END $$;
SQL

pg_restore --exit-on-error --no-owner --no-privileges --section=post-data --dbname="$NEON_DATABASE_URL" "$work/runtime.restore.dump"

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
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'azaad_dr_reconciliation'
  LOOP
    EXECUTE format('INSERT INTO public.azaad_dr_reconciliation(table_name,row_count) SELECT %L,count(*) FROM public.%I', r.tablename, r.tablename);
  END LOOP;
END $$;
SQL

cp "$work/runtime.dump.enc" "$evidence/runtime.dump.enc"
cp "$work/runtime.dump.enc.sha256" "$evidence/runtime.dump.enc.sha256"
cat > "$evidence/README.txt" <<'EOF'
Controlled Neon parity restore v2.

Authoritative archive includes public + private schemas because public runtime
functions depend on private SECURITY DEFINER helpers.

Auth users are represented only by minimal UUID placeholders required for FK
integrity. Passwords, sessions, refresh tokens and identities are not restored.

Auth/security helper functions are compatibility stubs only. They are not a
production authorization implementation.

Identity/auth portability, RLS/RPC/Edge Function behavioral equivalence and
production cutover remain separately gated.
EOF
chmod 600 "$evidence/runtime.dump.enc" "$evidence/runtime.dump.enc.sha256" "$evidence/README.txt"

echo 'PASS: public+private authoritative dump created'
echo 'PASS: encrypted snapshot integrity verified'
echo 'PASS: decrypted archive revalidated'
echo 'PASS: compatibility auth/security boundary initialized'
echo 'PASS: public+private schemas restored from authoritative archive'
echo 'PASS: runtime-critical private functions restored'
echo 'PASS: data restored'
echo 'PASS: referenced auth UUID placeholders reconciled'
echo 'PASS: post-data constraints restored'
echo 'PASS: reconciliation metadata recorded'
echo 'NOT PROVEN: identity/auth portability'
echo 'NOT PROVEN: RLS/RPC/Edge Function behavioral equivalence'
echo 'NOT PROVEN: production cutover'
