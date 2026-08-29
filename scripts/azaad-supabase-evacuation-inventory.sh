#!/usr/bin/env bash
set -euo pipefail

root="${GITHUB_WORKSPACE:-.}"
out="${RUNNER_TEMP:-/tmp}/azaad-supabase-evacuation"
mkdir -p "$out"

printf '%s\n' 'AZAAD Supabase Evacuation Inventory' > "$out/README.txt"
printf 'candidate_sha=%s\n' "${GITHUB_SHA:-unknown}" >> "$out/README.txt"
printf 'generated_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$out/README.txt"

printf '%s\n' '--- Edge Functions ---' >> "$out/README.txt"
if [ -d "$root/supabase/functions" ]; then
  find "$root/supabase/functions" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort >> "$out/README.txt"
else
  echo 'none' >> "$out/README.txt"
fi

printf '%s\n' '--- Storage references ---' >> "$out/README.txt"
if grep -RIl --exclude-dir=.git --exclude='*.map' -E 'supabase\.storage|storage\.from\(|/storage/v1/' "$root" 2>/dev/null | sed "s#^$root/##" | sort -u > "$out/storage-references.txt"; then
  cat "$out/storage-references.txt" >> "$out/README.txt"
else
  echo 'none detected' >> "$out/README.txt"
fi

printf '%s\n' '--- Supabase runtime references ---' >> "$out/README.txt"
grep -RIl --exclude-dir=.git --exclude='*.map' -E 'supabase\.co|supabase-js|createClient\(|SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY' "$root" 2>/dev/null | sed "s#^$root/##" | sort -u > "$out/runtime-references.txt" || true
cat "$out/runtime-references.txt" >> "$out/README.txt"

echo 'mode=READ_ONLY' >> "$out/README.txt"
echo 'no_data_moved=true' >> "$out/README.txt"
echo 'no_supabase_resource_deleted=true' >> "$out/README.txt"

cat "$out/README.txt"
