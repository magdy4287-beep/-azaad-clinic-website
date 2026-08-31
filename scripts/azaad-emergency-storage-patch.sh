#!/usr/bin/env bash
set -euo pipefail

# Emergency-only compatibility patch for Appwrite Cloud Free plan.
# Appwrite Cloud Free currently limits a single Storage file to 50 MB.
# Normalize the bucket maximum to the provider limit and keep optional
# encryption/antivirus disabled for the evacuation path.
script='scripts/azaad-supabase-storage-to-appwrite.sh'
old="maximumFileSize:30000000000,allowedFileExtensions:[],compression:'none',encryption:true,antivirus:true"
new="maximumFileSize:52428800,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false"

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
echo 'PASS: emergency Appwrite bucket payload normalized to 50 MiB with optional encryption/antivirus disabled'
