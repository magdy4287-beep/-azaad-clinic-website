#!/usr/bin/env bash
set -euo pipefail
: "${SUPABASE_URL:?Missing SUPABASE_URL secret}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Missing SUPABASE_SERVICE_ROLE_KEY secret}"

work="${RUNNER_TEMP}/azaad-auth-evacuation"
rm -rf "$work"
mkdir -p "$work"
chmod 700 "$work"
trap 'rm -rf "$work"' EXIT

base="${SUPABASE_URL%/}"
headers=(-H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
users_json="$work/users.json"
: > "$users_json"

# Read-only Auth inventory. Credentials, password hashes, access/refresh tokens and session secrets are never exported.
# Paginate until a short page is returned so the inventory is not capped at the first 1000 users.
page=1
while :; do
  page_json="$work/users-page-${page}.json"
  curl -fsS --retry 3 --retry-all-errors --connect-timeout 20 --max-time 120 "${headers[@]}" "$base/auth/v1/admin/users?page=${page}&per_page=1000" > "$page_json"
  test -s "$page_json"
  count="$(node - "$page_json" <<'NODE'
const fs=require('fs');
const d=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!Array.isArray(d.users)) throw new Error('FAIL-CLOSED: Supabase Auth admin response has no users array');
process.stdout.write(String(d.users.length));
NODE
)"
  node - "$page_json" "$users_json" <<'NODE'
const fs=require('fs');
const input=process.argv[2], output=process.argv[3];
const d=JSON.parse(fs.readFileSync(input,'utf8'));
if(!Array.isArray(d.users)) throw new Error('FAIL-CLOSED: invalid users page');
const existing=fs.readFileSync(output,'utf8').trim();
const users=existing?JSON.parse(existing):[];
users.push(...d.users);
fs.writeFileSync(output,JSON.stringify(users));
NODE
  echo "auth_users_page=${page} count=${count}"
  if [ "$count" -lt 1000 ]; then break; fi
  page=$((page+1))
  if [ "$page" -gt 10000 ]; then echo 'FAIL-CLOSED: Auth pagination safety limit exceeded.'; exit 1; fi
done

test -s "$users_json"

node - "$users_json" "$work/auth-manifest.json" <<'NODE'
const fs=require('fs');
const crypto=require('crypto');
const input=process.argv[2], output=process.argv[3];
const users=JSON.parse(fs.readFileSync(input,'utf8'));
if(!Array.isArray(users)) throw new Error('FAIL-CLOSED: normalized Auth inventory is not an array');
const clean=v=>String(v??'').trim();
const fingerprints=users.map(u=>crypto.createHash('sha256').update(clean(u.id)).digest('hex')).sort();
const providers=users.flatMap(u=>Array.isArray(u.identities)?u.identities.map(i=>clean(i.provider)).filter(Boolean):[]).sort();
const manifest={
  schema_version:2,
  status:'PASS',
  source:'supabase-auth',
  user_count:users.length,
  identity_count:users.reduce((n,u)=>n+(Array.isArray(u.identities)?u.identities.length:0),0),
  user_id_sha256_sorted:fingerprints,
  identity_providers:providers,
  sessions_exported:false,
  refresh_tokens_exported:false,
  password_hashes_exported:false,
  note:'Read-only identity inventory. Credentials, password hashes, sessions and refresh tokens are intentionally not exported.'
};
fs.writeFileSync(output,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
console.log(`PASS: Supabase Auth inventory discovered ${manifest.user_count} users and ${manifest.identity_count} identities.`);
console.log('PASS: credential/session material intentionally excluded.');
NODE

node - "$work/auth-manifest.json" <<'NODE'
const fs=require('fs');
const m=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(m.status!=='PASS'||!Number.isInteger(m.user_count)||m.user_count<0||!Number.isInteger(m.identity_count)||m.identity_count<0) process.exit(1);
if(!Array.isArray(m.user_id_sha256_sorted)||m.user_id_sha256_sorted.length!==m.user_count) process.exit(1);
if(m.sessions_exported||m.refresh_tokens_exported||m.password_hashes_exported) process.exit(1);
console.log('PASS: Auth evacuation inventory invariant.');
NODE

mkdir -p "$RUNNER_TEMP/azaad-auth-evidence"
cp "$work/auth-manifest.json" "$RUNNER_TEMP/azaad-auth-evidence/auth-manifest.json"
chmod 600 "$RUNNER_TEMP/azaad-auth-evidence/auth-manifest.json"
echo 'PASS: Auth identity inventory evidence created; no credentials or session material retained.'
