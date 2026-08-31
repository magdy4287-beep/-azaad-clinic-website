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

# Build the authoritative table invariant directly from the dump TOC.
# This avoids relying on a stale/generated file and makes the post-restore
# check cover exactly the tables the emergency artifact declares.
awk '$0 !~ /^;/ && $0 ~ /[[:space:]]TABLE[[:space:]]+public[[:space:]]/ {
  for (i=1; i<=NF; i++) if ($i == "public") { print $(i+1); break }
}' "$work/restored-archive.list" | sed '/^$/d' | sort -u > "$work/public.tables"
test -s "$work/public.tables"
echo "PREFLIGHT: $(wc -l < "$work/public.tables") public tables recorded for post-restore invariant."

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

# Emergency target reset is based on the LIVE target inventory. The target is
# reconstructed from the authoritative Supabase dump; the source is untouched.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS object_name,
           CASE c.relkind WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'VIEW' END AS object_kind
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('v','m')
  LOOP
    EXECUTE format('DROP %s IF EXISTS public.%I CASCADE', r.object_kind, r.object_name);
  END LOOP;
  FOR r IN
    SELECT c.relname AS object_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','f')
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.object_name);
  END LOOP;
  FOR r IN
    SELECT c.relname AS object_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='S'
  LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', r.object_name);
  END LOOP;
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           CASE p.prokind WHEN 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END AS routine_kind
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
  LOOP
    EXECUTE format('DROP %s IF EXISTS public.%I(%s) CASCADE', r.routine_kind, r.proname, r.args);
  END LOOP;
END $$;
COMMIT;
SQL

echo 'PASS: live public target inventory cleaned with CASCADE before restore.'

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

missing_tables=0
while IFS= read -r table_name; do
  [ -n "$table_name" ] || continue
  if ! psql "$NEON_DATABASE_URL" -Atqc "SELECT to_regclass('public.' || quote_ident('$table_name')) IS NOT NULL" | grep -qx 't'; then
    echo "FAIL-CLOSED: restored public table is missing: $table_name" >&2
    missing_tables=1
  fi
done < "$work/public.tables"
if [ "$missing_tables" -ne 0 ]; then exit 1; fi

echo 'PASS: restored public table invariant completed.'

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
The Neon public schema is reconstructed from the authoritative Supabase public dump.
Auth identity placeholders are created only for referential-integrity compatibility; Supabase Auth credentials/sessions are not restored here.
The destination is the emergency DR target. Supabase source is never modified by this script.
EOF

echo 'PASS: ordered database restore completed'
echo 'PASS: post-restore public table invariant completed'
echo 'PASS: encrypted recovery artifact retained'
echo 'FAIL-CLOSED: Supabase retirement/cutover remains blocked until identity, storage, edge functions, E2E, and production certification pass'