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
  grep -E 'TABLE|TABLE DATA|SCHEMA|FUNCTION|SEQUENCE' "$work/archive.list" | head -100 >&2 || true
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

# Keep the archive's native TOC, excluding only CREATE SCHEMA public.
cp "$work/restored-archive.list" "$work/restore.list"
awk '
  BEGIN { changed=0 }
  /^[[:space:]]*[0-9]+;[[:space:]]+[0-9]+[[:space:]]+[0-9]+[[:space:]]+SCHEMA[[:space:]]+-[[:space:]]+public([[:space:]]|$)/ {
    if ($0 !~ /^;/) { print ";" $0; changed=1; next }
  }
  { print }
  END { if (changed != 1) exit 2 }
' "$work/restored-archive.list" > "$work/restore.list"
test -s "$work/restore.list"

if grep -Eq '^[[:space:]]*[0-9]+;[[:space:]]+[0-9]+[[:space:]]+[0-9]+[[:space:]]+SCHEMA[[:space:]]+-[[:space:]]+public([[:space:]]|$)' "$work/restore.list"; then
  echo 'FAIL-CLOSED: active CREATE SCHEMA public entry remains in restore list.' >&2
  exit 1
fi
if ! grep -Eq '(^|[[:space:]])TABLE[[:space:]]+public[[:space:]]' "$work/restore.list"; then
  echo 'FAIL-CLOSED: restore list contains no public table entries.' >&2
  exit 1
fi

echo 'PREFLIGHT: filtered restore list is valid and public schema creation is excluded.'

# Clean only objects represented by the authoritative archive. Each generated
# file is executed over one persistent psql connection, so cleanup does not
# create one network round-trip per DROP statement.
awk '
  $0 !~ /^;/ {
    line=$0
    sub(/^[[:space:]]*[0-9]+;[[:space:]]*/, "", line)
    n=split(line, a, /[[:space:]]+/)
    if (n >= 5 && a[3] == "TABLE" && a[4] == "public" && a[5] != "") print a[5]
  }
' "$work/restore.list" | sort -u > "$work/public.tables"
test -s "$work/public.tables"

{
  echo 'BEGIN;'
  while IFS= read -r table_name; do
    escaped_name=$(printf '%s' "$table_name" | sed 's/"/""/g')
    printf 'DROP TABLE IF EXISTS public."%s" CASCADE;\n' "$escaped_name"
  done < "$work/public.tables"
  echo 'COMMIT;'
} > "$work/drop-public-tables.sql"
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$work/drop-public-tables.sql"

awk '
  $0 !~ /^;/ {
    line=$0
    sub(/^[[:space:]]*[0-9]+;[[:space:]]*/, "", line)
    if (line ~ /FUNCTION[[:space:]]+public[[:space:]]+/) {
      sub(/^.*FUNCTION[[:space:]]+public[[:space:]]+/, "", line)
      sub(/[[:space:]]+[^[:space:]]*$/, "", line)
      print line
    }
  }
' "$work/restore.list" | sort -u > "$work/public.functions"

{
  echo 'BEGIN;'
  while IFS= read -r function_identity; do
    [ -n "$function_identity" ] || continue
    function_name="${function_identity%%(*}"
    function_args="${function_identity#*(}"
    function_args="${function_args%)}"
    escaped_name=$(printf '%s' "$function_name" | sed 's/"/""/g')
    printf 'DROP FUNCTION IF EXISTS public."%s"(%s) CASCADE;\n' "$escaped_name" "$function_args"
  done < "$work/public.functions"
  echo 'COMMIT;'
} > "$work/drop-public-functions.sql"

if [ -s "$work/drop-public-functions.sql" ]; then
  psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$work/drop-public-functions.sql"
fi

awk '
  $0 !~ /^;/ {
    line=$0
    sub(/^[[:space:]]*[0-9]+;[[:space:]]*/, "", line)
    n=split(line, a, /[[:space:]]+/)
    if (n >= 5 && a[3] == "SEQUENCE" && a[4] == "public" && a[5] != "") print a[5]
  }
' "$work/restore.list" | sort -u > "$work/public.sequences"

{
  echo 'BEGIN;'
  while IFS= read -r sequence_name; do
    [ -n "$sequence_name" ] || continue
    escaped_name=$(printf '%s' "$sequence_name" | sed 's/"/""/g')
    printf 'DROP SEQUENCE IF EXISTS public."%s" CASCADE;\n' "$escaped_name"
  done < "$work/public.sequences"
  echo 'COMMIT;'
} > "$work/drop-public-sequences.sql"

if [ -s "$work/drop-public-sequences.sql" ]; then
  psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$work/drop-public-sequences.sql"
fi

# Restore in three explicit PostgreSQL phases. This is deliberate: pre-data
# creates all TABLE/type objects first; data then runs with trigger disabling;
# post-data adds indexes, constraints, policies, and other dependent objects.
# No --clean is used here because the destination has already been cleaned with
# CASCADE. This prevents pg_restore from attempting DROP operations against
# dependencies while simultaneously applying the archive.
pg_restore --exit-on-error --no-owner --no-privileges \
  --section=pre-data --use-list="$work/restore.list" \
  --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"

echo 'PASS: restore pre-data phase completed; table definitions exist before data phase.'

pg_restore --exit-on-error --no-owner --no-privileges --disable-triggers \
  --section=data --use-list="$work/restore.list" \
  --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"

echo 'PASS: restore data phase completed with triggers disabled.'

pg_restore --exit-on-error --no-owner --no-privileges \
  --section=post-data --use-list="$work/restore.list" \
  --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"
echo 'PASS: restore post-data phase completed.'

# Post-restore invariant: every archive-listed public table must now exist before
# any reconciliation is declared successful.
missing_tables=0
while IFS= read -r table_name; do
  [ -n "$table_name" ] || continue
  if ! psql "$NEON_DATABASE_URL" -Atqc "SELECT to_regclass('public.' || quote_ident('$table_name')) IS NOT NULL" | grep -qx 't'; then
    echo "FAIL-CLOSED: restored public table is missing: $table_name" >&2
    missing_tables=1
  fi
done < "$work/public.tables"
if [ "$missing_tables" -ne 0 ]; then
  exit 1
fi

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
The Neon public schema is preserved; only archive-listed public objects are cleaned before restore.
Auth identity placeholders are created only for referential-integrity compatibility; Supabase Auth credentials/sessions are not restored here.
The destination is treated as the emergency DR target; the public schema itself is never dropped.
EOF

echo 'PASS: ordered database restore completed'
echo 'PASS: post-restore public table invariant completed'
echo 'PASS: encrypted recovery artifact retained'
echo 'FAIL-CLOSED: Supabase retirement/cutover remains blocked until identity, storage, edge functions, E2E, and production certification pass'
