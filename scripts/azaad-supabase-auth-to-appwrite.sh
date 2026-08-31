#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
: "${APPWRITE_ENDPOINT:?APPWRITE_ENDPOINT is required}"
: "${APPWRITE_PROJECT_ID:?APPWRITE_PROJECT_ID is required}"
: "${APPWRITE_API_KEY:?APPWRITE_API_KEY is required}"

SUPABASE_URL="${SUPABASE_URL%/}"
APPWRITE_ENDPOINT="${APPWRITE_ENDPOINT%/}"
EVIDENCE_DIR="${RUNNER_TEMP:-/tmp}/azaad-auth-migration"
mkdir -p "$EVIDENCE_DIR"
chmod 700 "$EVIDENCE_DIR"
MANIFEST="$EVIDENCE_DIR/manifest.json"

node <<'NODE'
const fs=require('fs');
const crypto=require('crypto');
const s=String(process.env.SUPABASE_URL).replace(/\/$/,'');
const sk=String(process.env.SUPABASE_SERVICE_ROLE_KEY);
const a=String(process.env.APPWRITE_ENDPOINT).replace(/\/$/,'');
const p=String(process.env.APPWRITE_PROJECT_ID);
const k=String(process.env.APPWRITE_API_KEY);
const out=process.env.RUNNER_TEMP+'/azaad-auth-migration/manifest.json';
const headers={Authorization:`Bearer ${sk}`,apikey:sk,Accept:'application/json'};
const ah={'X-Appwrite-Project':p,'X-Appwrite-Key':k,'Accept':'application/json','Content-Type':'application/json'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function req(url,opt={}){for(let i=0;i<3;i++){const r=await fetch(url,opt);const t=await r.text();let j;try{j=JSON.parse(t)}catch{j={raw:t}};if(r.ok)return j;if(r.status>=500&&i<2){await sleep(500*(i+1));continue}throw new Error(`${opt.method||'GET'} ${url} -> HTTP ${r.status}: ${JSON.stringify({type:j.type,message:j.message,code:j.code})}`)}}
async function supUsers(){let all=[],page=1;for(;;page++){const j=await req(`${s}/auth/v1/admin/users?page=${page}&per_page=1000`,{headers});const batch=Array.isArray(j.users)?j.users:[];all.push(...batch);if(batch.length<1000)break;if(page>10000)throw new Error('FAIL-CLOSED: excessive user pagination');}return all}
async function appUsers(){let all=[],offset=0;for(;;){const j=await req(`${a}/users?limit=100&offset=${offset}`,{headers:ah});const batch=Array.isArray(j.users)?j.users:[];all.push(...batch);if(batch.length<100)break;offset+=batch.length;if(offset>1000000)throw new Error('FAIL-CLOSED: excessive Appwrite pagination');}return all}
(async()=>{
 const source=await supUsers();
 const dest=await appUsers();
 const byId=new Map(dest.map(u=>[u.$id,u]));
 const byEmail=new Map(dest.filter(u=>u.email).map(u=>[u.email.toLowerCase(),u]));
 let created=0,existing=0,conflicts=0;
 const results=[];
 for(const u of source){
   if(!u.id||!u.email)throw new Error('FAIL-CLOSED: source identity missing id/email');
   const id=String(u.id);
   const email=String(u.email).trim().toLowerCase();
   const sameId=byId.get(id);
   const sameEmail=byEmail.get(email);
   if(sameId){
     if(String(sameId.email||'').toLowerCase()!==email){conflicts++;results.push({id,status:'CONFLICT_ID_EMAIL'});continue}
     existing++;results.push({id,status:'EXISTS'});continue;
   }
   if(sameEmail){conflicts++;results.push({id,status:'CONFLICT_EMAIL'});continue}
   // Password hashes are intentionally not exported. A unique temporary secret is sent only in the API request;
   // it is never logged or written to artifacts. The account must use the application's recovery/reset flow.
   const temporaryPassword=crypto.randomBytes(32).toString('base64url')+'Aa1!';
   const createdUser=await req(`${a}/users`,{method:'POST',headers:ah,body:JSON.stringify({userId:id,email,password:temporaryPassword,name:u.user_metadata?.full_name||u.user_metadata?.name||undefined,emailVerification:Boolean(u.email_confirmed_at)})});
   byId.set(createdUser.$id,createdUser);byEmail.set(email,createdUser);created++;results.push({id,status:'CREATED'});
 }
 if(conflicts)throw new Error(`FAIL-CLOSED: ${conflicts} identity conflicts require manual resolution`);
 const manifest={status:'PASS',source_users:source.length,destination_users_before:dest.length,created,existing,conflicts,identity_passwords_exported:false,plaintext_passwords_exported:false,candidate_sha:process.env.GITHUB_SHA||'unknown',results};
 fs.writeFileSync(out,JSON.stringify(manifest,null,2),{mode:0o600});
 console.log(`PASS: Auth identity evacuation reconciled source=${source.length} created=${created} existing=${existing}`);
 console.log('passwords_exported=false');
})().catch(e=>{console.error('FAIL-CLOSED:',e.message);process.exit(1)})
NODE

node -e "const m=require(process.env.RUNNER_TEMP+'/azaad-auth-migration/manifest.json'); if(m.status!=='PASS'||m.source_users!==m.created+m.existing||m.conflicts!==0||m.plaintext_passwords_exported||m.identity_passwords_exported) process.exit(1); console.log('PASS: Auth reconciliation gate')"
