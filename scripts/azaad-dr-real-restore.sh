#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${NEON_DATABASE_URL:?Missing NEON_DATABASE_URL secret}"
: "${DR_BACKUP_PASSPHRASE:?Missing DR_BACKUP_PASSPHRASE secret}"

export PATH="/usr/lib/postgresql/17/bin:$PATH"
export PGSSLMODE=require

for cmd in pg_dump pg_restore psql sha256sum openssl cmp grep sed awk; do
  command -v "$cmd" >/dev/null || { echo "ERROR: required command not found: $cmd" >&2; exit 127; }
done

work="${RUNNER_TEMP}/azaad-dr"
evidence="${RUNNER_TEMP}/azaad-dr-evidence"
rm -rf "$work" "$evidence"
mkdir -p "$work" "$evidence"
chmod 700 "$work" "$evidence"
trap 'rm -rf "$work"' EXIT

pg_dump "$SUPABASE_DB_URL" --format=custom --schema=public --no-owner --no-privileges --file="$work/public.dump"
test -s "$work/public.dump"
pg_restore --list "$work/public.dump" > "$work/archive.list"
test -s "$work/archive.list"
sha256sum "$work/public.dump" | tee "$work/public.dump.sha256"

if ! grep -Eq '(^|[[:space:]])TABLE[[:space:]]+public[[:space:]]' "$work/archive.list"; then
  echo 'FAIL-CLOSED: archive contains no public table entries.' >&2
  grep -E 'TABLE|TABLE DATA|SCHEMA' "$work/archive.list" | head -100 >&2 || true
  exit 1
fi

echo 'PREFLIGHT: public table entries detected.'

openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:DR_BACKUP_PASSPHRASE -in "$work/public.dump" -out "$work/public.dump.enc"
sha256sum "$work/public.dump.enc" | tee "$work/public.dump.enc.sha256"
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:DR_BACKUP_PASSPHRASE -in "$work/public.dump.enc" -out "$work/public.restore.dump"
sha256sum -c "$work/public.dump.sha256" --ignore-missing
cmp "$work/public.dump" "$work/public.restore.dump"
pg_restore --list "$work/public.restore.dump" > "$work/restored-archive.list"
test -s "$work/restored-archive.list"

psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS security;
CREATE TABLE IF NOT EXISTS auth.users (id uuid NOT NULL PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user)::text; $$;
CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.email', true), '')::text; $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb; $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE OR REPLACE FUNCTION security.can_access_patient(patient_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false; $$;
CREATE OR REPLACE FUNCTION security.can_access_patient_clinical(patient_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false; $$;
REVOKE ALL ON FUNCTION security.can_access_patient(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION security.can_access_patient_clinical(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_access_patient(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION security.can_access_patient_clinical(uuid) TO authenticated;
SQL

# pg_restore list files are line-oriented TOC specifications.  Comment the exact
# public-schema CREATE entry rather than relying on a broad regex; the destination
# PostgreSQL database owns the public schema and it must never be recreated.
cp "$work/restored-archive.list" "$work/restore.list"
awk '
  BEGIN { changed=0 }
  /^[[:space:]]*[0-9]+;[[:space:]]+[^;]+;[[:space:]]+SCHEMA[[:space:]]+-[[:space:]]+public([[:space:]]|$)/ {
    if ($0 !~ /^;/) { print ";" $0; changed=1; next }
  }
  { print }
  END { if (changed != 1) exit 2 }
' "$work/restored-archive.list" > "$work/restore.list"
test -s "$work/restore.list"

if grep -Eq '^[[:space:]]*[0-9]+;[[:space:]]+[^;]+;[[:space:]]+SCHEMA[[:space:]]+-[[:space:]]+public([[:space:]]|$)' "$work/restore.list"; then
  echo 'FAIL-CLOSED: active CREATE SCHEMA public entry remains in restore list.' >&2
  grep -E 'SCHEMA|TABLE|TABLE DATA' "$work/restore.list" | head -100 >&2 || true
  exit 1
fi
if ! grep -Eq '(^|[[:space:]])TABLE[[:space:]]+public[[:space:]]' "$work/restore.list"; then
  echo 'FAIL-CLOSED: restore list contains no public table entries.' >&2
  grep -E 'TABLE|TABLE DATA|SCHEMA' "$work/restore.list" | head -100 >&2 || true
  exit 1
fi

echo 'PREFLIGHT: filtered restore list is valid and public schema creation is excluded.'

# The previous emergency attempt partially populated the dedicated Neon DR target.
# The archive is authoritative for the public schema objects, so clean only objects
# represented by this archive before recreating them. This never touches Supabase.
pg_restore --exit-on-error --clean --if-exists --no-owner --no-privileges --use-list="$work/restore.list" --section=pre-data --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"
pg_restore --exit-on-error --no-owner --no-privileges --use-list="$work/restore.list" --section=data --disable-triggers --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"

psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type = 'uuid'
      AND (column_name = 'auth_user_id' OR column_name = 'user_id' OR column_name LIKE '%_user_id'
           OR column_name IN ('created_by','updated_by','approved_by','verified_by','cancelled_by','completed_by','checked_in_by','checked_out_by'))
    ORDER BY table_schema, table_name, column_name
  LOOP
    EXECUTE format('INSERT INTO auth.users (id) SELECT DISTINCT %I FROM %I.%I WHERE %I IS NOT NULL ON CONFLICT (id) DO NOTHING', r.column_name, r.table_schema, r.table_name, r.column_name);
  END LOOP;
END $$;
SQL

pg_restore --exit-on-error --no-owner --no-privileges --use-list="$work/restore.list" --section=post-data --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"

psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.azaad_dr_reconciliation (
  checked_at timestamptz NOT NULL DEFAULT now(), table_name text NOT NULL, row_count bigint NOT NULL,
  PRIMARY KEY (checked_at, table_name)
);
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'azaad_dr_reconciliation' ORDER BY tablename LOOP
    EXECUTE format('INSERT INTO public.azaad_dr_reconciliation (table_name,row_count) SELECT %L,count(*) FROM public.%I', r.tablename, r.tablename);
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
The plaintext dump is intentionally not preserved.
The Neon public schema is preserved; only the archive CREATE SCHEMA public entry is excluded.
Auth identity placeholders are created only for referential-integrity compatibility; Supabase Auth credentials/sessions are not restored here.
The destination is treated as the emergency DR target; --clean removes only objects represented by the recovery archive before recreation.
EOF

echo 'PASS: strict post-data restore completed'
echo 'PASS: encrypted recovery artifact retained'
echo 'FAIL-CLOSED: Supabase retirement/cutover remains blocked until identity, storage, edge functions, E2E, and production certification pass'
