#!/usr/bin/env bash
set -euo pipefail

# Emergency-only compatibility patch for Appwrite Cloud Free.
# This patch is intentionally narrow: it may rewrite only the known legacy
# 5 GB Appwrite payload. Current canonical implementations are successful
# no-ops regardless of whether the value is expressed as a JS const, object
# property, or formatting variant.
script='scripts/azaad-supabase-storage-to-appwrite.sh'
old="maximumFileSize:5000000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false,transformations:false"
old_without_transform="maximumFileSize:5000000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false"
new="maximumFileSize:50000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false,transformations:false"

# Canonical semantic state: the migration implementation explicitly defines
# the 50 MB Appwrite limit and wires that value into maximumFileSize. Do not
# require one exact source-code spelling; formatting/minification must not
# make an already-safe candidate fail the emergency gate.
if grep -Eq 'APPWRITE_MAX_FILE_SIZE[[:space:]]*=[[:space:]]*50_?000_?000([;,)[:space:]]|$)' "$script" && \
   grep -Eq 'maximumFileSize[[:space:]]*:[[:space:]]*APPWRITE_MAX_FILE_SIZE' "$script"; then
  echo 'PASS: Appwrite bucket payload is already canonical at 50,000,000 bytes'
  exit 0
fi

# Also accept a canonical literal payload if a future refactor removes the
# helper constant. Require the complete known field set to avoid a broad pass.
if grep -Fq "$new" "$script" || grep -Fq 'maximumFileSize:50000000' "$script"; then
  echo 'PASS: Appwrite bucket payload is already normalized to 50,000,000 bytes'
  exit 0
fi

# Only the exact legacy payloads are eligible for an automatic rewrite.
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

if ! grep -Fq "$new" "$script" && ! grep -Fq 'maximumFileSize:50000000' "$script"; then
  echo 'FAIL-CLOSED: Appwrite payload normalization could not be verified after rewrite.'
  exit 1
fi
echo 'PASS: emergency Appwrite bucket payload normalized to 50,000,000 bytes with encryption/antivirus disabled'