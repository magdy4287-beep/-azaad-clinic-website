#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${APPWRITE_ENDPOINT:?Missing APPWRITE_ENDPOINT secret}"
: "${APPWRITE_PROJECT_ID:?Missing APPWRITE_PROJECT_ID secret}"
: "${APPWRITE_API_KEY:?Missing APPWRITE_API_KEY secret}"

export PGSSLMODE=require
command -v psql >/dev/null || { echo 'FAIL: psql is required'; exit 127; }

endpoint="${APPWRITE_ENDPOINT%/}"
work="${RUNNER_TEMP:-/tmp}/azaad-auth-preflight"
rm -rf "$work"
mkdir -p "$work"
chmod 700 "$work"
trap 'rm -rf "$work"' EXIT

# Read only. Credential hashes, sessions, refresh tokens and secrets are never selected or printed.
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -Atqc \
  "SELECT id::text FROM auth.users ORDER BY id" > "$work/supabase_ids.txt"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -Atqc \
  "SELECT lower(trim(email)) FROM auth.users WHERE email IS NOT NULL AND trim(email) <> '' ORDER BY lower(trim(email))" > "$work/supabase_emails.txt"

node --input-type=module - "$endpoint" "$APPWRITE_PROJECT_ID" "$APPWRITE_API_KEY" "$work/appwrite.json" <<'NODE'
import { writeFile } from 'node:fs/promises';
const [endpoint, projectId, apiKey, output] = process.argv.slice(2);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 30000);
try {
  const response = await fetch(`${endpoint}/users?limit=100`, {
    method: 'GET',
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      Accept: 'application/json'
    },
    signal: controller.signal
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`FAIL: Appwrite users read returned HTTP ${response.status}`);
    process.exit(1);
  }
  await writeFile(output, body, { mode: 0o600 });
} catch (error) {
  console.error(`FAIL: Appwrite users request failed: ${error?.name ?? 'Error'}`);
  process.exit(1);
} finally {
  clearTimeout(timer);
}
NODE

if ! command -v jq >/dev/null 2>&1; then
  sudo apt-get update >/dev/null
  sudo apt-get install -y jq >/dev/null
fi

jq -r '.users[]?.$id' "$work/appwrite.json" | sort -u > "$work/appwrite_ids.txt"
jq -r '.users[]?.email // empty | ascii_downcase | ascii_upcase' "$work/appwrite.json" | sort -u | tr '[:upper:]' '[:lower:]' > "$work/appwrite_emails.txt"

supabase_count="$(wc -l < "$work/supabase_ids.txt" | tr -d ' ')"
appwrite_count="$(wc -l < "$work/appwrite_ids.txt" | tr -d ' ')"
supabase_email_count="$(wc -l < "$work/supabase_emails.txt" | tr -d ' ')"
appwrite_email_count="$(wc -l < "$work/appwrite_emails.txt" | tr -d ' ')"

if [ "$supabase_count" -eq 0 ]; then
  echo 'FAIL: Supabase auth inventory is empty.'
  exit 1
fi
if [ "$appwrite_count" -gt 100 ]; then
  echo 'FAIL: Appwrite preflight page limit exceeded; pagination is required before parity can be certified.'
  exit 1
fi

comm -3 "$supabase_ids.txt" "$appwrite_ids.txt" > "$work/id_diff.txt" || true
comm -3 "$supabase_emails.txt" "$appwrite_emails.txt" > "$work/email_diff.txt" || true

if [ -s "$work/id_diff.txt" ]; then
  echo "NOT_PROVEN: auth identity ID sets differ (Supabase=${supabase_count}, Appwrite=${appwrite_count})."
  echo 'No mutation performed.'
  exit 2
fi

if [ "$supabase_email_count" -ne "$appwrite_email_count" ] || [ -s "$work/email_diff.txt" ]; then
  echo "NOT_PROVEN: auth identity email sets differ (Supabase=${supabase_email_count}, Appwrite=${appwrite_email_count})."
  echo 'No mutation performed.'
  exit 2
fi

echo "PASS: read-only auth identity UUID parity (users=${supabase_count})."
echo "PASS: read-only auth identity email parity (emails=${supabase_email_count})."
echo 'PASS: no password hashes, sessions, refresh tokens, or credentials were exported by this preflight.'
echo 'PASS: no production mutation performed.'
