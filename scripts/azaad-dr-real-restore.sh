#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${NEON_DATABASE_URL:?Missing NEON_DATABASE_URL secret}"
: "${DR_BACKUP_PASSPHRASE:?Missing DR_BACKUP_PASSPHRASE secret}"

export PATH="/usr/lib/postgresql/17/bin:$PATH"
export PGSSLMODE=require

for cmd in pg_dump pg_restore psql sha256sum openssl awk grep; do
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

psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
SQL

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

# Restore post-data through a filtered pg_restore TOC instead of piping
# pg_restore's generated SQL through a text parser. This is robust across
# PostgreSQL client versions and guarantees that TOC metadata is never sent to
# psql as SQL. Only foreign-key constraints that explicitly reference
# auth.users are removed; all other constraints, indexes, triggers and
# functions remain part of the restore.
awk '
  /auth\.users/ && /CONSTRAINT/ && /FK CONSTRAINT/ { next }
  { print }
' "$work/restored-archive.list" > "$work/post-data.portable.list"
test -s "$work/post-data.portable.list"

pg_restore \
  --exit-on-error \
  --no-owner --no-privileges \
  --use-list="$work/post-data.portable.list" \
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
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'azaad_dr_reconciliation' ORDER BY tablename LOOP
    EXECUTE format(
      'INSERT INTO public.azaad_dr_reconciliation (table_name, row_count) SELECT %L, count(*) FROM public.%I',
      r.tablename,
      r.tablename
    );
  END LOOP;
END $$;
SQL

cp "$work/public.dump.enc" "$evidence/public.dump.enc"
cp "$work/public.dump.enc.sha256" "$evidence/public.dump.enc.sha256"
cat > "$evidence/README.txt" <<'EOF'
AZAAD Emergency DR encrypted recovery artifact.

The archive is encrypted with the controlled DR passphrase stored in GitHub
Actions secrets. The plaintext dump is intentionally not preserved.

Identity/Auth portability, RLS/RPC/Edge Function equivalence, and production
cutover are separate certification gates and are not implied by this artifact.
EOF
chmod 600 "$evidence/public.dump.enc" "$evidence/public.dump.enc.sha256" "$evidence/README.txt"

echo "PASS: PostgreSQL 17 archive toolchain"
echo "PASS: custom dump validated with pg_restore --list"
echo "PASS: encrypted snapshot integrity verified"
echo "PASS: decrypted archive revalidated"
echo "PASS: Neon compatibility boundary initialized"
echo "PASS: clean public-schema replacement completed"
echo "PASS: strict pre-data and data restore completed"
echo "PASS: filtered TOC post-data restore completed"
echo "PASS: reconciliation metadata recorded"
echo "PASS: encrypted recovery artifact staged for retention"
echo "NOT PROVEN: identity/auth portability"
echo "NOT PROVEN: FK equivalence for Supabase auth.users references"
echo "NOT PROVEN: RLS/RPC/Edge Function behavioral equivalence"
echo "NOT PROVEN: production cutover"
