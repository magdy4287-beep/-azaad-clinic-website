#!/usr/bin/env bash
set -euo pipefail

# AZAAD Supabase Dependency Elimination Audit.
# Inventory only: it does not modify runtime code and does not contact Supabase.
# Supabase is permitted here only as rollback/evacuation source material.

OUT="${1:-supabase-dependency-audit.txt}"
: > "$OUT"

echo "AZAAD_SUPABASE_DEPENDENCY_AUDIT" | tee -a "$OUT"
echo "branch=${GITHUB_REF_NAME:-unknown}" | tee -a "$OUT"
echo "sha=${GITHUB_SHA:-unknown}" | tee -a "$OUT"
echo | tee -a "$OUT"

git ls-files -z | while IFS= read -r -d '' f; do
  case "$f" in
    .git/*|supabase/functions/*|supabase/migrations/*|supabase/config.toml|docs/*|*.md|qa/*|scripts/azaad-*supabase*|scripts/azaad-dr-*|.github/workflows/azaad-emergency-dr-*) continue ;;
  esac
  case "$f" in
    *.js|*.mjs|*.cjs|*.ts|*.tsx|*.html|*.css|*.json|*.yml|*.yaml|*.py|*.sh|*.toml|*.env*) ;;
    *) continue ;;
  esac
  if grep -nE -i 'supabase(-js)?|derofsthjivlkcdnojww\.supabase\.co|SUPABASE_(URL|ANON_KEY|PUBLISHABLE_KEY|SERVICE_ROLE_KEY)|/functions/v1/|/rest/v1/|createClient\(' "$f" >> "$OUT" 2>/dev/null; then
    :
  fi
done

if grep -qE 'supabase(-js)?|derofsthjivlkcdnojww\.supabase\.co|SUPABASE_(URL|ANON_KEY|PUBLISHABLE_KEY|SERVICE_ROLE_KEY)|/functions/v1/|/rest/v1/|createClient\(' "$OUT"; then
  echo | tee -a "$OUT"
  echo "FAIL-CLOSED: runtime Supabase dependency references remain." | tee -a "$OUT"
  exit 1
fi

echo "PASS: no Supabase runtime dependency references found in audited runtime source." | tee -a "$OUT"
