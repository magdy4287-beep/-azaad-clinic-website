#!/usr/bin/env bash
set -euo pipefail

: "${APPWRITE_ENDPOINT:?APPWRITE_ENDPOINT is required}"
: "${APPWRITE_PROJECT_ID:?APPWRITE_PROJECT_ID is required}"
: "${APPWRITE_API_KEY:?APPWRITE_API_KEY is required}"

endpoint="${APPWRITE_ENDPOINT%/}"
evidence_dir="${RUNNER_TEMP:-/tmp}/azaad-appwrite-evidence"
mkdir -p "$evidence_dir"

# Read-only inventory. Never print user records or the API key.
response="$evidence_dir/users.json"
status="$(curl -sS -o "$response" -w '%{http_code}' \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT_ID}" \
  -H "X-Appwrite-Key: ${APPWRITE_API_KEY}" \
  -H 'Content-Type: application/json' \
  "${endpoint}/users?limit=1")"

if [ "$status" != "200" ]; then
  echo "FAIL: Appwrite users read returned HTTP ${status}" >&2
  rm -f "$response"
  exit 1
fi

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

# Raw API response is intentionally removed; only non-sensitive counts remain.
rm -f "$response"
cat "$evidence_dir/README.txt"
echo "PASS: Appwrite Auth read-only inventory completed; users_total=${count}"
