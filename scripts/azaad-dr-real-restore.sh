#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${NEON_DATABASE_URL:?Missing NEON_DATABASE_URL secret}"
: "${DR_BACKUP_PASSPHRASE:?Missing DR_BACKUP_PASSPHRASE secret}"

command -v pg_dump >/dev/null
command -v pg_restore >/dev/null
command -v psql >/dev/null
command -v sha256sum >/dev/null
command -v openssl >/dev/null

work="${RUNNER_TEMP}/azaad-dr"
rm -rf "$work"
mkdir -p "$work"
chmod 700 "$work"
trap 'rm -rf "$work"' EXIT

export PGSSLMODE=require

# Capture a portable public-domain snapshot. Auth identities are deliberately excluded.
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file="$work/public.dump"

sha256sum "$work/public.dump" | tee "$work/public.dump.sha256"

# Encrypt the snapshot for ephemeral transport/storage. The passphrase is supplied only
# through the runner secret and is never printed or persisted to Git.
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -pass env:DR_BACKUP_PASSPHRASE \
  -in "$work/public.dump" \
  -out "$work/public.dump.enc"

sha256sum "$work/public.dump.enc" | tee "$work/public.dump.enc.sha256"

# Decrypt into an ephemeral file and prove the original checksum before touching DR.
openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass env:DR_BACKUP_PASSPHRASE \
  -in "$work/public.dump.enc" \
  -out "$work/public.restore.dump"

sha256sum -c "$work/public.dump.sha256" --ignore-missing
cmp "$work/public.dump" "$work/public.restore.dump"

# Restore only the portable public data model. Identity/auth and provider-specific
# runtime behavior remain separate qualification gates.
pg_restore \
  --clean --if-exists \
  --no-owner --no-privileges \
  --dbname="$NEON_DATABASE_URL" \
  "$work/public.restore.dump"

# Reconcile counts without emitting row contents to logs.
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
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
    EXECUTE format(
      'INSERT INTO public.azaad_dr_reconciliation (table_name, row_count) SELECT %L, count(*) FROM public.%I',
      r.tablename,
      r.tablename
    );
  END LOOP;
END $$;
SQL

echo "PASS: encrypted portable public-schema export"
echo "PASS: SHA-256 integrity verification"
echo "PASS: DR restore completed"
echo "PASS: reconciliation metadata recorded"
echo "NOT PROVEN: identity/auth portability"
echo "NOT PROVEN: RLS/RPC/Edge Function behavioral equivalence"
echo "NOT PROVEN: production cutover"
