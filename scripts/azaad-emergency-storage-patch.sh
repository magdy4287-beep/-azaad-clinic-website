#!/usr/bin/env bash
set -euo pipefail

# Emergency-only compatibility patch for the current Appwrite Cloud bucket limit.
# The canonical migration script currently requests 30,000,000,000 bytes.
# Appwrite Cloud's current paid Storage limit is 5 GiB, so normalize the request
# before the evacuation run. This patch is deliberately exact and fail-closed.
script='scripts/azaad-supabase-storage-to-appwrite.sh'
old="maximumFileSize:30000000000,allowedFileExtensions:[],compression:'none',encryption:true,antivirus:true"
new="maximumFileSize:5368709120,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false"

if ! grep -Fq "$old" "$script"; then
  echo 'FAIL-CLOSED: expected Appwrite bucket payload was not found; refusing a broad rewrite.'
  exit 1
fi

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

grep -Fq "$new" "$script"
echo 'PASS: emergency Appwrite bucket payload normalized to 5 GiB with optional encryption/antivirus disabled'
