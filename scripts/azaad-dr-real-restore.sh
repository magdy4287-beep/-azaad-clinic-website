#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${NEON_DATABASE_URL:?Missing NEON_DATABASE_URL secret}"
: "${DR_BACKUP_PASSPHRASE:?Missing DR_BACKUP_PASSPHRASE secret}"

export PATH="/usr/lib/postgresql/17/bin:$PATH"
export PGSSLMODE=require

for cmd in pg_dump pg_restore psql sha256sum openssl awk cmp; do
  command -v "$cmd" >/dev/null || { echo "ERROR: required command not found: $cmd" >&2; exit 127; }
done

work="${RUNNER_TEMP}/azaad-dr"
rm -rf "$work"
mkdir -p "$work"
chmod 700 "$work"
trap 'rm -rf "$work"' EXIT

# The portable source artifact is deliberately a PostgreSQL custom/archive dump.
# Never pass this binary archive to psql; psql is used only for SQL text/queries.
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file="$work/public.dump"

# Prove the archive is readable by the matching PostgreSQL 17 restore client before
# any destructive operation is performed against the Neon DR target.
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

# Neon receives an explicit compatibility boundary for Supabase-owned identity objects.
# This does NOT claim identity portability or authentication equivalence.
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

# Destructive operation is confined to the Neon DR target. Do not recreate public:
# the dump's pre-data section owns CREATE SCHEMA public.
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
SQL

# Restore the archive with pg_restore only. Strict pre-data/data phases prevent silent
# partial restores and keep binary archive content away from psql.
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

# Convert only the post-data archive section to SQL text. Filter only FK statements
# targeting Supabase's intentionally non-portable auth identity plane. All remaining
# post-data SQL is applied fail-closed with ON_ERROR_STOP.
pg_restore \
  --no-owner --no-privileges \
  --section=post-data \
  --file="$work/post-data.sql" \
  "$work/public.restore.dump"

awk 'BEGIN { RS=";"; ORS=";\n" } !/REFERENCES[[:space:]]+auth\.users[[:space:]]*\(/' \
  "$work/post-data.sql" > "$work/post-data.portable.sql"

psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f "$work/post-data.portable.sql"

# Reconcile without emitting row contents.
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

echo "PASS: PostgreSQL 17 archive toolchain"
echo "PASS: custom dump validated with pg_restore --list"
echo "PASS: encrypted snapshot integrity verified"
echo "PASS: decrypted archive revalidated"
echo "PASS: Neon compatibility boundary initialized"
echo "PASS: clean public-schema replacement completed"
echo "PASS: strict pre-data and data restore completed"
echo "PASS: portable post-data restore completed"
echo "PASS: reconciliation metadata recorded"
echo "NOT PROVEN: identity/auth portability"
echo "NOT PROVEN: FK equivalence for Supabase auth.users references"
echo "NOT PROVEN: RLS/RPC/Edge Function behavioral equivalence"
echo "NOT PROVEN: production cutover"
