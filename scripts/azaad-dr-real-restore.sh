#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${NEON_DATABASE_URL:?Missing NEON_DATABASE_URL secret}"
: "${DR_BACKUP_PASSPHRASE:?Missing DR_BACKUP_PASSPHRASE secret}"
export PATH="/usr/lib/postgresql/17/bin:$PATH"; export PGSSLMODE=require
for cmd in pg_dump pg_restore psql sha256sum openssl cmp awk sed grep; do command -v "$cmd" >/dev/null || { echo "ERROR: required command not found: $cmd" >&2; exit 127; }; done
work="${RUNNER_TEMP}/azaad-dr"; evidence="${RUNNER_TEMP}/azaad-dr-evidence"; rm -rf "$work" "$evidence"; mkdir -p "$work" "$evidence"; chmod 700 "$work" "$evidence"; trap 'rm -rf "$work"' EXIT
pg_dump "$SUPABASE_DB_URL" --format=custom --schema=public --no-owner --no-privileges --file="$work/public.dump"; test -s "$work/public.dump"; pg_restore --list "$work/public.dump" > "$work/archive.list"; test -s "$work/archive.list"; sha256sum "$work/public.dump" | tee "$work/public.dump.sha256"
grep -Eq '(^|[[:space:]])TABLE[[:space:]]+public[[:space:]]' "$work/archive.list" || { echo 'FAIL-CLOSED: authoritative dump contains no public table entries.' >&2; exit 1; }
awk '$0 !~ /^;/ && $0 ~ /[[:space:]]TABLE[[:space:]]+public[[:space:]]/ { for (i=1; i<=NF; i++) if ($i == "public") { print $(i+1); break } }' "$work/archive.list" | sed '/^$/d' | sort -u > "$work/public.tables"; test -s "$work/public.tables"; echo "PREFLIGHT: $(wc -l < "$work/public.tables") public tables recorded."
openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:DR_BACKUP_PASSPHRASE -in "$work/public.dump" -out "$work/public.dump.enc"; sha256sum "$work/public.dump.enc" | tee "$work/public.dump.enc.sha256"; openssl enc -d -aes-256-cbc -pbkdf2 -pass env:DR_BACKUP_PASSPHRASE -in "$work/public.dump.enc" -out "$work/public.restore.dump"; sha256sum -c "$work/public.dump.sha256"; cmp "$work/public.dump" "$work/public.restore.dump"
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS security;
CREATE TABLE IF NOT EXISTS auth.users (id uuid NOT NULL PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user)::text; $$;
CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.email', true), '')::text; $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF; END $$;
CREATE OR REPLACE FUNCTION security.can_access_patient(patient_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false; $$;
CREATE OR REPLACE FUNCTION security.can_access_patient_clinical(patient_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false; $$;
REVOKE ALL ON FUNCTION security.can_access_patient(uuid) FROM PUBLIC; REVOKE ALL ON FUNCTION security.can_access_patient_clinical(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION security.can_access_patient(uuid) TO authenticated; GRANT EXECUTE ON FUNCTION security.can_access_patient_clinical(uuid) TO authenticated;
-- Neon is the dedicated evacuation target. Reset only public; never modify the Supabase source.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postgres') THEN
    EXECUTE 'GRANT ALL ON SCHEMA public TO postgres';
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO PUBLIC;
SQL
pg_restore --exit-on-error --no-owner --no-privileges --section=pre-data --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"; echo 'PASS: authoritative pre-data restore.'
missing=0; while IFS= read -r table_name; do [ -n "$table_name" ] || continue; if ! psql "$NEON_DATABASE_URL" -Atqc "SELECT to_regclass(format('public.%I', '$table_name')) IS NOT NULL" | grep -qx 't'; then echo "FAIL-CLOSED: table missing after pre-data restore: $table_name" >&2; missing=1; fi; done < "$work/public.tables"; [ "$missing" -eq 0 ] || exit 1; echo 'PASS: pre-data table invariant.'
pg_restore --exit-on-error --no-owner --no-privileges --disable-triggers --section=data --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"; echo 'PASS: authoritative data restore.'
pg_restore --exit-on-error --no-owner --no-privileges --section=post-data --dbname="$NEON_DATABASE_URL" "$work/public.restore.dump"; echo 'PASS: authoritative post-data restore.'
missing=0; while IFS= read -r table_name; do [ -n "$table_name" ] || continue; if ! psql "$NEON_DATABASE_URL" -Atqc "SELECT to_regclass(format('public.%I', '$table_name')) IS NOT NULL" | grep -qx 't'; then echo "FAIL-CLOSED: restored table missing: $table_name" >&2; missing=1; fi; done < "$work/public.tables"; [ "$missing" -eq 0 ] || exit 1; echo 'PASS: final public table invariant.'
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$ DECLARE r record; BEGIN FOR r IN SELECT table_schema,table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND data_type='uuid' AND (column_name='auth_user_id' OR column_name='user_id' OR column_name LIKE '%_user_id' OR column_name IN ('created_by','updated_by','approved_by','verified_by','cancelled_by','completed_by','checked_in_by','checked_out_by')) ORDER BY table_schema,table_name,column_name LOOP EXECUTE format('INSERT INTO auth.users(id) SELECT DISTINCT %I FROM %I.%I WHERE %I IS NOT NULL ON CONFLICT(id) DO NOTHING',r.column_name,r.table_schema,r.table_name,r.column_name); END LOOP; END $$;
SQL
cp "$work/public.dump.enc" "$evidence/public.dump.enc"; cp "$work/public.dump.enc.sha256" "$evidence/public.dump.enc.sha256"; chmod 600 "$evidence/public.dump.enc" "$evidence/public.dump.enc.sha256"; printf '%s\n' 'AZAAD Emergency DR encrypted recovery artifact.' 'Plaintext dump is intentionally not retained.' 'Supabase source is read-only for this operation.' 'Only the dedicated Neon public schema is reset.' 'Supabase retirement/cutover remains blocked until Storage, identity, edge functions, E2E and certification pass.' > "$evidence/README.txt"
echo 'PASS: ordered database evacuation restore completed.'; echo 'PASS: encrypted recovery artifact retained.'; echo 'FAIL-CLOSED: Supabase retirement/cutover remains blocked until Storage and certification gates pass.'