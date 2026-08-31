#!/usr/bin/env bash
set -euo pipefail

# Emergency-only compatibility patch for Appwrite Cloud Free.
# The current migration uses a plan-safe 50 MB ceiling and resolves/reuses
# the destination bucket separately; that state is a safe idempotent no-op.
# Only the known legacy 5 GB payload may be rewritten automatically.
script='scripts/azaad-supabase-storage-to-appwrite.sh'
old="maximumFileSize:5000000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false,transformations:false"
old_without_transform="maximumFileSize:5000000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false"
new="maximumFileSize:50000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false,transformations:false"

# Current canonical migration state: 50 MB ceiling + explicit Appwrite
# destination/bucket handling. Do not require a bucket-creation payload here.
if grep -Eq 'APPWRITE_MAX_FILE_SIZE[[:space:]]*=[[:space:]]*50_?000_?000([;,)[:space:]]|$)' "$script" && \
   grep -Eq 'APPWRITE_(BUCKET_ID|ENDPOINT|PROJECT_ID)|buckets/' "$script"; then
  echo 'PASS: current Appwrite migration is canonical and plan-safe (no-op)'
  exit 0
fi

# Revisions that expose maximumFileSize directly are also canonical.
if grep -Eq 'APPWRITE_MAX_FILE_SIZE[[:space:]]*=[[:space:]]*50_?000_?000([;,)[:space:]]|$)' "$script" && \
   grep -Eq 'maximumFileSize[[:space:]]*:[[:space:]]*APPWRITE_MAX_FILE_SIZE' "$script"; then
  echo 'PASS: Appwrite bucket payload is canonical at 50,000,000 bytes (no-op)'
  exit 0
fi

if grep -Eq 'maximumFileSize[[:space:]]*:[[:space:]]*50_?000_?000([,;)}[:space:]]|$)' "$script"; then
  echo 'PASS: Appwrite bucket payload is normalized to 50,000,000 bytes (no-op)'
  exit 0
fi

if grep -Fq "$new" "$script"; then
  echo 'PASS: Appwrite bucket payload is already canonical (no-op)'
  exit 0
fi

# Only exact legacy payloads are eligible for automatic rewriting.
if grep -Fq "$old" "$script"; then
  python3 - "$script" "$old" "$new" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1]); old, new = sys.argv[2], sys.argv[3]
s = p.read_text(); count = s.count(old)
if count != 1: raise SystemExit(f'FAIL-CLOSED: expected exactly one bucket payload, found {count}')
p.write_text(s.replace(old, new, 1))
PY
elif grep -Fq "$old_without_transform" "$script"; then
  replacement="maximumFileSize:50000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false"
  python3 - "$script" "$old_without_transform" "$replacement" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1]); old, new = sys.argv[2], sys.argv[3]
s = p.read_text(); count = s.count(old)
if count != 1: raise SystemExit(f'FAIL-CLOSED: expected exactly one bucket payload, found {count}')
p.write_text(s.replace(old, new, 1))
PY
else
  echo 'FAIL-CLOSED: expected Appwrite bucket payload was not found; refusing a broad rewrite.'
  exit 1
fi

if ! grep -Eq 'maximumFileSize[[:space:]]*:[[:space:]]*50_?000_?000([,;)}[:space:]]|$)' "$script"; then
  echo 'FAIL-CLOSED: Appwrite payload normalization could not be verified after rewrite.'
  exit 1
fi
echo 'PASS: emergency Appwrite bucket payload normalized to 50,000,000 bytes with encryption/antivirus disabled'
