#!/usr/bin/env bash
set -euo pipefail

: "${APPWRITE_ENDPOINT:?APPWRITE_ENDPOINT is required}"
: "${APPWRITE_PROJECT_ID:?APPWRITE_PROJECT_ID is required}"
: "${APPWRITE_API_KEY:?APPWRITE_API_KEY is required}"

# Normalize credentials at the process boundary. GitHub Actions secrets can
# accidentally contain CR/LF or surrounding whitespace; Node fetch rejects
# such values when constructing HTTP headers. Do not print the values.
clean_env() {
  printf '%s' "$1" | tr -d '\r\n' | sed -E 's/^[[:space:]]+|[[:space:]]+$//g'
}
export APPWRITE_ENDPOINT="$(clean_env "${APPWRITE_ENDPOINT}")"
export APPWRITE_PROJECT_ID="$(clean_env "${APPWRITE_PROJECT_ID}")"
export APPWRITE_API_KEY="$(clean_env "${APPWRITE_API_KEY}")"

: "${APPWRITE_ENDPOINT:?APPWRITE_ENDPOINT is empty after normalization}"
: "${APPWRITE_PROJECT_ID:?APPWRITE_PROJECT_ID is empty after normalization}"
: "${APPWRITE_API_KEY:?APPWRITE_API_KEY is empty after normalization}"

endpoint="${APPWRITE_ENDPOINT%/}"
evidence_dir="${RUNNER_TEMP:-/tmp}/azaad-appwrite-evidence"
mkdir -p "$evidence_dir"
response="$evidence_dir/users.json"

# Read-only inventory. Never print user records or the API key.
node <<'NODE'
const fs = require('fs');
const endpoint = String(process.env.APPWRITE_ENDPOINT || '').trim().replace(/[\r\n]+/g, '').replace(/\/$/, '');
const project = String(process.env.APPWRITE_PROJECT_ID || '').trim().replace(/[\r\n]+/g, '');
const key = String(process.env.APPWRITE_API_KEY || '').trim().replace(/[\r\n]+/g, '');
const output = process.env.RUNNER_TEMP ? `${process.env.RUNNER_TEMP}/azaad-appwrite-evidence/users.json` : '/tmp/azaad-appwrite-evidence/users.json';
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 30000);
(async () => {
  try {
    const res = await fetch(`${endpoint}/users?limit=1`, {
      method: 'GET',
      headers: {
        'X-Appwrite-Project': project,
        'X-Appwrite-Key': key,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    const text = await res.text();
    fs.writeFileSync(output, text, { mode: 0o600 });
    if (res.status !== 200) {
      console.error(`FAIL: Appwrite users read returned HTTP ${res.status}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`FAIL: Appwrite users request failed: ${err.name || 'Error'}`);
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
})();
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
