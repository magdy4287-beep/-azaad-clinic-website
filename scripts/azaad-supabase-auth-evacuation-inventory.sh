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

# Read-only Auth inventory. Password hashes, access/refresh tokens and session secrets are never exported.
users_json="$work/users.json"
curl -fsS --retry 3 --retry-all-errors --connect-timeout 20 --max-time 120 "${headers[@]}" "$base/auth/v1/admin/users?per_page=1000" > "$users_json"

test -s "$users_json"

node - "$users_json" "$work/auth-manifest.json" <<'NODE'
const fs=require('fs');
const crypto=require('crypto');
const input=process.argv[2], output=process.argv[3];
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const users=Array.isArray(data.users)?data.users:[];
if(!Array.isArray(data.users)) throw new Error('FAIL-CLOSED: Supabase Auth admin response has no users array');
const clean=v=>String(v??'').trim();
const fingerprints=users.map(u=>crypto.createHash('sha256').update(clean(u.id)).digest('hex')).sort();
const providers=users.flatMap(u=>Array.isArray(u.identities)?u.identities.map(i=>clean(i.provider)).filter(Boolean):[]).sort();
const manifest={
  schema_version:1,
  status:'PASS',
  source:'supabase-auth',
  user_count:users.length,
  identity_count:users.reduce((n,u)=>n+(Array.isArray(u.identities)?u.identities.length:0),0),
  user_id_sha256_sorted:fingerprints,
  identity_providers:providers,
  sessions_exported:false,
  refresh_tokens_exported:false,
  password_hashes_exported:false,
  note:'Read-only identity inventory. Credentials, sessions and refresh tokens are intentionally not exported.'
};
fs.writeFileSync(output,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
console.log(`PASS: Supabase Auth inventory discovered ${manifest.user_count} users and ${manifest.identity_count} identities.`);
console.log('PASS: credential/session material intentionally excluded.');
NODE

node - "$work/auth-manifest.json" <<'NODE'
const fs=require('fs');
const m=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(m.status!=='PASS'||m.user_count<0||m.identity_count<0) process.exit(1);
if(m.sessions_exported||m.refresh_tokens_exported||m.password_hashes_exported) process.exit(1);
console.log('PASS: Auth evacuation inventory invariant.');
NODE

mkdir -p "$RUNNER_TEMP/azaad-auth-evidence"
cp "$work/auth-manifest.json" "$RUNNER_TEMP/azaad-auth-evidence/auth-manifest.json"
chmod 600 "$RUNNER_TEMP/azaad-auth-evidence/auth-manifest.json"
echo 'PASS: Auth identity inventory evidence created; no credentials or session material retained.'