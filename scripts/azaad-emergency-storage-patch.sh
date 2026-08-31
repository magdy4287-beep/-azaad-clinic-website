#!/usr/bin/env bash
set -euo pipefail

# Emergency-only compatibility patch for Appwrite Cloud Free.
# This patch is intentionally narrow: it may rewrite only the known legacy
# 5 GB Appwrite payload. Any already-safe canonical implementation is a
# successful no-op. Unknown payloads remain fail-closed.
script='scripts/azaad-supabase-storage-to-appwrite.sh'
old="maximumFileSize:5000000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false,transformations:false"
old_without_transform="maximumFileSize:5000000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false"
new="maximumFileSize:50000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false,transformations:false"

# Canonical semantic state. Accept the actual supported source spellings,
# including separators/whitespace introduced by formatting or minification.
# Do not key the gate on a bucket name: bucket reuse is a migration concern,
# not evidence that this payload is safe.
if grep -Eq 'APPWRITE_MAX_FILE_SIZE[[:space:]]*=[[:space:]]*50_?000_?000([;,)[:space:]]|$)' "$script" && \
   grep -Eq 'maximumFileSize[[:space:]]*:[[:space:]]*APPWRITE_MAX_FILE_SIZE' "$script"; then
  echo 'PASS: Appwrite bucket payload is already canonical at 50,000,000 bytes (no-op)'
  exit 0
fi

# Canonical literal form, with optional separators/spaces. Require the
# maximumFileSize field itself so an unrelated 50 MB constant cannot pass.
if grep -Eq 'maximumFileSize[[:space:]]*:[[:space:]]*50_?000_?000([,;)}[:space:]]|$)' "$script"; then
  echo 'PASS: Appwrite bucket payload is already normalized to 50,000,000 bytes (no-op)'
  exit 0
fi

# Also accept the complete known canonical payload from older revisions.
if grep -Fq "$new" "$script"; then
  echo 'PASS: Appwrite bucket payload is already canonical (no-op)'
  exit 0
fi

# Only exact legacy payloads are eligible for automatic rewriting.
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

if ! grep -Eq 'maximumFileSize[[:space:]]*:[[:space:]]*50_?000_?000([,;)}[:space:]]|$)' "$script"; then
  echo 'FAIL-CLOSED: Appwrite payload normalization could not be verified after rewrite.'
  exit 1
fi
echo 'PASS: emergency Appwrite bucket payload normalized to 50,000,000 bytes with encryption/antivirus disabled'