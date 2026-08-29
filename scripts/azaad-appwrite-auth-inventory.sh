#!/usr/bin/env bash
set -euo pipefail

: "${APPWRITE_ENDPOINT:?APPWRITE_ENDPOINT is required}"
: "${APPWRITE_PROJECT_ID:?APPWRITE_PROJECT_ID is required}"
: "${APPWRITE_API_KEY:?APPWRITE_API_KEY is required}"

endpoint="${APPWRITE_ENDPOINT%/}"
evidence_dir="${RUNNER_TEMP:-/tmp}/azaad-appwrite-evidence"
mkdir -p "$evidence_dir"

# Read-only inventory. Use Node's native fetch to avoid curl transport quirks.
response="$evidence_dir/users.json"
node --input-type=module - "$endpoint" "$APPWRITE_PROJECT_ID" "$APPWRITE_API_KEY" "$response" <<'NODE'
import { writeFile } from 'node:fs/promises';
const [endpoint, projectId, apiKey, output] = process.argv.slice(2);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 30000);
try {
  const res = await fetch(`${endpoint}/users?limit=1`, {
    method: 'GET',
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    signal: controller.signal,
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`FAIL: Appwrite users read returned HTTP ${res.status}`);
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

count="$(jq -r '.total // 0' "$response")"
if ! [[ "$count" =~ ^[0-9]+$ ]]; then
  echo 'FAIL: Appwrite users response did not contain a numeric total' >&2
  rm -f "$response"
  exit 1
fi

cat > "$evidence_dir/README.txt" <<EOF
AZAAD Appwrite Auth Read-Only Inventory
candidate_sha=${GITHUB_SHA:-unknown}
project_id=${APPWRITE_PROJECT_ID}
endpoint=${endpoint}
users_total=${count}
mode=READ_ONLY
no_user_records_published=true
EOF

rm -f "$response"
cat "$evidence_dir/README.txt"
echo "PASS: Appwrite Auth read-only inventory completed; users_total=${count}"
