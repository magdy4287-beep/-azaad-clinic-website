#!/usr/bin/env bash
set -euo pipefail

# Emergency-only compatibility patch for Appwrite Cloud Free.
# The migration script may express the canonical 50 MB limit through a
# variable rather than an inline object literal. Treat that representation as
# already normalized; only rewrite the known legacy 5 GB payload.
script='scripts/azaad-supabase-storage-to-appwrite.sh'
old="maximumFileSize:5000000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false,transformations:false"
old_without_transform="maximumFileSize:5000000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false"
new="maximumFileSize:50000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false,transformations:false"

# Canonical current implementation: accept the semantic representation rather
# than one exact formatting/number-literal spelling. This is intentionally a
# successful no-op and keeps the emergency patch idempotent across formatting
# changes while retaining the fail-closed guard against broad rewrites.
if grep -Eq 'APPWRITE_MAX_FILE_SIZE[[:space:]]*=[[:space:]]*50_?000_?000' "$script" && \
   grep -Eq 'maximumFileSize[[:space:]]*:[[:space:]]*APPWRITE_MAX_FILE_SIZE' "$script"; then
  echo 'PASS: Appwrite bucket payload is already canonical at 50,000,000 bytes'
  exit 0
fi

if grep -Fq "$new" "$script" || grep -Fq 'maximumFileSize:50000000' "$script"; then
  echo 'PASS: Appwrite bucket payload is already normalized to 50,000,000 bytes'
  exit 0
fi

if grep -Fq "$old" "$script"; then
  python3 - "$script" "$old" "$new" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
old, new = sys.argv[2], sys.argv[3]
s = p.read_text()
count = s.count(old)
if count != 1:
    raise SystemExit(f'FAIL-CLOSED: expected exactly one bucket payload, found {count}')
p.write_text(s.replace(old, new, 1))
PY
elif grep -Fq "$old_without_transform" "$script"; then
  replacement="maximumFileSize:50000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false"
  python3 - "$script" "$old_without_transform" "$replacement" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
old, new = sys.argv[2], sys.argv[3]
s = p.read_text()
count = s.count(old)
if count != 1:
    raise SystemExit(f'FAIL-CLOSED: expected exactly one bucket payload, found {count}')
p.write_text(s.replace(old, new, 1))
PY
else
  echo 'FAIL-CLOSED: expected Appwrite bucket payload was not found; refusing a broad rewrite.'
  exit 1
fi

grep -Fq "$new" "$script" || grep -Fq 'maximumFileSize:50000000' "$script"
echo 'PASS: emergency Appwrite bucket payload normalized to 50,000,000 bytes with encryption/antivirus disabled'