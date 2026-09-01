#!/usr/bin/env bash
set -euo pipefail
: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${NEON_DATABASE_URL:?Missing NEON_DATABASE_URL secret}"
: "${DR_BACKUP_PASSPHRASE:?Missing DR_BACKUP_PASSPHRASE secret}"
export PATH="/usr/lib/postgresql/17/bin:$PATH"; export PGSSLMODE=require
for cmd in pg_dump pg_restore psql sha256sum openssl cmp awk sed grep sort; do command -v "$cmd" >/dev/null || { echo "ERROR: required command not found: $cmd" >&2; exit 127; }; done
work="${RUNNER_TEMP}/azaad-dr"; evidence="${RUNNER_TEMP}/azaad-dr-evidence"; rm -rf "$work" "$evidence"; mkdir -p "$work" "$evidence"; chmod 700 "$work" "$evidence"; trap 'rm -rf "$work"' EXIT
# The public runtime depends on SECURITY DEFINER helpers in private, so the authoritative DR dump must include both schemas.
pg_dump "$SUPABASE_DB_URL" --format=custom --schema=public --schema=private --no-owner --no-privileges --file="$work/public-private.dump"; test -s "$work/public-private.dump"; pg_restore --list "$work/public-private.dump" > "$work/archive.list"; test -s "$work/archive.list"; sha256sum "$work/public-private.dump" | tee "$work/public-private.dump.sha256"
grep -Eq '(^|[[:space:]])TABLE[[:space:]]+public[[:space:]]' "$work/archive.list" || { echo 'FAIL-CLOSED: authoritative dump contains no public table entries.' >&2; exit 1; }
grep -Eq '(^|[[:space:]])SCHEMA[[:space:]]+-[[:space:]]+private([[:space:]]|$)' "$work/archive.list" || { echo 'FAIL-CLOSED: authoritative dump is missing the private schema entry.' >&2; exit 1; }
grep -Eq '(^|[[:space:]])FUNCTION[[:space:]]+private[[:space:]]' "$work/archive.list" || { echo 'FAIL-CLOSED: authoritative dump contains no private function entries.' >&2; exit 1; }
awk '$0 !~ /^;/ && $0 ~ /[[:space:]]TABLE[[:space:]]+public[[:space:]]/ { for (i=1; i<=NF; i++) if ($i == "public") { print $(i+1); break } }' "$work/archive.list" | sed '/^$/d' | sort -u > "$work/public.tables"; test -s "$work/public.tables"; echo "PREFLIGHT: $(wc -l < "$work/public.tables") public tables recorded."
awk '$0 !~ /^;/ && $0 ~ /[[:space:]]FUNCTION[[:space:]]+private[[:space:]]/ { count++ } END { print count+0 }' "$work/archive.list" > "$work/private.function.count"; echo "PREFLIGHT: $(cat "$work/private.function.count") private functions recorded."
cp "$work/archive.list" "$work/restore.list"; test -s "$work/restore.list"
grep -Eq '(^|[[:space:]])SCHEMA[[:space:]]+-[[:space:]]+public([[:space:]]|$)' "$work/restore.list" || { echo 'FAIL-CLOSED: authoritative dump is missing the public schema TOC entry.' >&2; exit 1; }
grep -Eq '(^|[[:space:]])SCHEMA[[:space:]]+-[[:space:]]+private([[:space:]]|$)' "$work/restore.list" || { echo 'FAIL-CLOSED: authoritative dump is missing the private schema TOC entry.' >&2; exit 1; }
openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:DR_BACKUP_PASSPHRASE -in "$work/public-private.dump" -out "$work/public-private.dump.enc"; sha256sum "$work/public-private.dump.enc" | tee "$work/public-private.dump.enc.sha256"; openssl enc -d -aes-256-cbc -pbkdf2 -pass env:DR_BACKUP_PASSPHRASE -in "$work/public-private.dump.enc" -out "$work/public-private.restore.dump"; sha256sum -c "$work/public-private.dump.sha256"; cmp "$work/public-private.dump" "$work/public-private.restore.dump"
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS security;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
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
DROP SCHEMA IF EXISTS private CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;
SQL
# Both authoritative schemas are recreated by pg_restore. This avoids fabricating private security helpers and preserves the dump's dependency ordering.
pg_restore --exit-on-error --no-owner --no-privileges --use-list="$work/restore.list" --section=pre-data --dbname="$NEON_DATABASE_URL" "$work/public-private.restore.dump"; echo 'PASS: authoritative public + private pre-data restore.'
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO PUBLIC;
SQL
psql "$NEON_DATABASE_URL" -Atqc "SELECT to_regnamespace('public') IS NOT NULL AND to_regnamespace('private') IS NOT NULL" | grep -qx 't' || { echo 'FAIL-CLOSED: authoritative public/private schemas missing after pre-data restore.' >&2; exit 1; }
missing=0; while IFS= read -r table_name; do [ -n "$table_name" ] || continue; if ! psql "$NEON_DATABASE_URL" -Atqc "SELECT to_regclass(format('public.%I', '$table_name')) IS NOT NULL" | grep -qx 't'; then echo "FAIL-CLOSED: table missing after pre-data restore: $table_name" >&2; missing=1; fi; done < "$work/public.tables"; [ "$missing" -eq 0 ] || exit 1; echo 'PASS: pre-data public table invariant.'
pg_restore --exit-on-error --no-owner --no-privileges --use-list="$work/restore.list" --disable-triggers --section=data --dbname="$NEON_DATABASE_URL" "$work/public-private.restore.dump"; echo 'PASS: authoritative data restore.'
pg_restore --exit-on-error --no-owner --no-privileges --use-list="$work/restore.list" --section=post-data --dbname="$NEON_DATABASE_URL" "$work/public-private.restore.dump"; echo 'PASS: authoritative post-data restore.'
missing=0; while IFS= read -r table_name; do [ -n "$table_name" ] || continue; if ! psql "$NEON_DATABASE_URL" -Atqc "SELECT to_regclass(format('public.%I', '$table_name')) IS NOT NULL" | grep -qx 't'; then echo "FAIL-CLOSED: restored table missing: $table_name" >&2; missing=1; fi; done < "$work/public.tables"; [ "$missing" -eq 0 ] || exit 1; echo 'PASS: final public table invariant.'
private_count="$(psql "$NEON_DATABASE_URL" -Atqc "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private'")"; test "$private_count" -ge "$(cat "$work/private.function.count")" || { echo "FAIL-CLOSED: private function count after restore is lower than authoritative dump." >&2; exit 1; }; echo "PASS: private function invariant ($private_count restored)."
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$ DECLARE r record; BEGIN FOR r IN SELECT table_schema,table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND data_type='uuid' AND (column_name='auth_user_id' OR column_name='user_id' OR column_name LIKE '%_user_id' OR column_name IN ('created_by','updated_by','approved_by','verified_by','cancelled_by','completed_by','checked_in_by','checked_out_by')) ORDER BY table_schema,table_name,column_name LOOP EXECUTE format('INSERT INTO auth.users(id) SELECT DISTINCT %I FROM %I.%I WHERE %I IS NOT NULL ON CONFLICT(id) DO NOTHING',r.column_name,r.table_schema,r.table_name,r.column_name); END LOOP; END $$;
SQL
cp "$work/public-private.dump.enc" "$evidence/public-private.dump.enc"; cp "$work/public-private.dump.enc.sha256" "$evidence/public-private.dump.enc.sha256"; chmod 600 "$evidence/public-private.dump.enc" "$evidence/public-private.dump.enc.sha256"; printf '%s\n' 'AZAAD Emergency DR encrypted recovery artifact.' 'Plaintext dump is intentionally not retained.' 'Supabase source is read-only for this operation.' 'Authoritative public and private schemas are restored to Neon.' 'Supabase retirement/cutover remains blocked until Storage, identity, edge functions, E2E and certification pass.' > "$evidence/README.txt"
echo 'PASS: ordered database evacuation restore completed.'; echo 'PASS: encrypted recovery artifact retained.'; echo 'FAIL-CLOSED: Supabase retirement/cutover remains blocked until Storage and certification gates pass.'
