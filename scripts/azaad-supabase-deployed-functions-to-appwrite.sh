#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"
: "${SUPABASE_PROJECT_ID:?SUPABASE_PROJECT_ID is required}"
: "${DR_BACKUP_PASSPHRASE:?DR_BACKUP_PASSPHRASE is required}"
: "${APPWRITE_ENDPOINT:?APPWRITE_ENDPOINT is required}"
: "${APPWRITE_PROJECT_ID:?APPWRITE_PROJECT_ID is required}"
: "${APPWRITE_API_KEY:?APPWRITE_API_KEY is required}"

ROOT="${RUNNER_TEMP:-/tmp}/azaad-deployed-functions"
DOWNLOAD_ROOT="$ROOT/download"
EVIDENCE_DIR="$ROOT/evidence"
MANIFEST="$EVIDENCE_DIR/manifest.json"
mkdir -p "$DOWNLOAD_ROOT" "$EVIDENCE_DIR"
chmod 700 "$ROOT" "$DOWNLOAD_ROOT" "$EVIDENCE_DIR"

command -v supabase >/dev/null || { echo 'FAIL-CLOSED: Supabase CLI is unavailable.' >&2; exit 127; }
command -v openssl >/dev/null || { echo 'FAIL-CLOSED: openssl is unavailable.' >&2; exit 127; }
command -v sha256sum >/dev/null || { echo 'FAIL-CLOSED: sha256sum is unavailable.' >&2; exit 127; }
command -v tar >/dev/null || { echo 'FAIL-CLOSED: tar is unavailable.' >&2; exit 127; }
command -v curl >/dev/null || { echo 'FAIL-CLOSED: curl is unavailable.' >&2; exit 127; }

ENDPOINT="${APPWRITE_ENDPOINT%/}"
METADATA_JSON="$ROOT/functions.json"

curl -fsS --retry 3 --retry-delay 1 \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H 'Accept: application/json' \
  "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/functions" > "$METADATA_JSON"

node - "$METADATA_JSON" "$DOWNLOAD_ROOT" <<'NODE'
const fs=require('fs');
const metadataPath=process.argv[2];
const downloadRoot=process.argv[3];
const list=JSON.parse(fs.readFileSync(metadataPath,'utf8'));
if(!Array.isArray(list)||list.length<1) throw new Error('FAIL-CLOSED: Supabase Management API returned no deployed Edge Functions.');
fs.writeFileSync(downloadRoot+'/expected-functions.json',JSON.stringify(list,null,2),{mode:0o600});
console.log(`deployed_function_count=${list.length}`);
for(const f of list){ if(!f.slug) throw new Error('FAIL-CLOSED: deployed function metadata is missing slug.'); console.log(`${f.slug}\tversion=${f.version}\tverify_jwt=${f.verify_jwt}\tezbr_sha256=${f.ezbr_sha256||''}`); }
NODE

# Supabase documents that omitting the function name downloads all deployed functions.
# --use-api avoids requiring Docker and keeps this evacuation deterministic on GitHub-hosted runners.
(cd "$DOWNLOAD_ROOT" && supabase functions download --project-ref "$SUPABASE_PROJECT_ID" --use-api)

node - "$DOWNLOAD_ROOT/expected-functions.json" "$DOWNLOAD_ROOT" <<'NODE'
const fs=require('fs'),path=require('path');
const expected=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const root=process.argv[3];
const dirs=fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
const exp=expected.map(x=>x.slug).sort();
const missing=exp.filter(x=>!dirs.includes(x));
const extra=dirs.filter(x=>!exp.includes(x));
if(missing.length) throw new Error(`FAIL-CLOSED: deployed functions missing after download: ${missing.join(',')}`);
if(extra.length) console.log(`INFO: extra downloaded directories ignored: ${extra.join(',')}`);
console.log(`PASS: deployed function source download reconciled ${exp.length}/${exp.length}`);
NODE

node <<'NODE'
const fs=require('fs'),crypto=require('crypto'),cp=require('child_process'),path=require('path');
const {execFileSync}=cp;
const root=process.env.RUNNER_TEMP+'/azaad-deployed-functions/download';
const evidence=process.env.RUNNER_TEMP+'/azaad-deployed-functions/evidence';
const expected=JSON.parse(fs.readFileSync(root+'/expected-functions.json','utf8'));
const endpoint=String(process.env.APPWRITE_ENDPOINT).replace(/\/$/,'');
const project=String(process.env.APPWRITE_PROJECT_ID),key=String(process.env.APPWRITE_API_KEY);
const pass=String(process.env.DR_BACKUP_PASSPHRASE);
const out=evidence+'/manifest.json';
const headers={'X-Appwrite-Project':project,'X-Appwrite-Key':key,'Accept':'application/json','Content-Type':'application/json'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function req(url,opt={}){for(let i=0;i<3;i++){const r=await fetch(url,opt),t=await r.text();let j;try{j=JSON.parse(t)}catch{j={raw:t}};if(r.ok)return j;if(r.status>=500&&i<2){await sleep(700*(i+1));continue}throw new Error(`${opt.method||'GET'} ${url} -> HTTP ${r.status}: ${JSON.stringify({type:j.type,message:j.message,code:j.code})}`)}}
function fileId(slug){return 'df-'+crypto.createHash('sha256').update(slug).digest('hex').slice(0,30)}
function formFor(fileId,buffer,filename,mime){const form=new FormData();form.append('fileId',fileId);form.append('file',new Blob([buffer],{type:mime}),filename);return form}
async function upload(bucketId,fileId,buffer,filename,mime){return req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files`,{method:'POST',headers:{'X-Appwrite-Project':project,'X-Appwrite-Key':key,'Accept':'application/json'},body:formFor(fileId,buffer,filename,mime)})}
async function update(bucketId,fileId,buffer,filename,mime){return req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}`,{method:'PUT',headers:{'X-Appwrite-Project':project,'X-Appwrite-Key':key,'Accept':'application/json'},body:formFor(fileId,buffer,filename,mime)})}
async function remove(bucketId,fileId){return req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}`,{method:'DELETE',headers:{'X-Appwrite-Project':project,'X-Appwrite-Key':key,'Accept':'application/json'})}
async function getFile(bucketId,fileId){try{return await req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}`,{headers})}catch(e){if(String(e.message).includes('404'))return null;throw e}}
async function upsert(bucketId,fileId,buffer,filename,mime){let f=await getFile(bucketId,fileId);if(!f)return upload(bucketId,fileId,buffer,filename,mime);f=await update(bucketId,fileId,buffer,filename,mime);if(Number(f.sizeOriginal)===buffer.length)return f;await remove(bucketId,fileId);f=await upload(bucketId,fileId,buffer,filename,mime);return f}
async function listBuckets(){const d=await req(`${endpoint}/storage/buckets?limit=100`,{headers});return Array.isArray(d.buckets)?d.buckets:[]}
(async()=>{
 const buckets=await listBuckets();
 let bucket=buckets.find(b=>b.$id==='azaad-edge-functions-dr')||buckets.find(b=>b.name==='AZAAD Edge Functions DR');
 if(!bucket&&buckets.length===1) bucket=buckets[0];
 if(!bucket) throw new Error(`FAIL-CLOSED: no usable Appwrite Storage bucket. Existing buckets=${buckets.length}`);
 const results=[];
 for(const meta of expected){
   const slug=String(meta.slug),dir=path.join(root,slug);
   if(!fs.existsSync(dir)||!fs.statSync(dir).isDirectory()) throw new Error(`FAIL-CLOSED: downloaded source directory missing for ${slug}`);
   const archive=path.join(process.env.RUNNER_TEMP,`deployed-${slug}.tar.gz`), encrypted=archive+'.enc';
   execFileSync('tar',['-czf',archive,'--exclude=.env','--exclude=.env.*','--exclude=node_modules','--exclude=.git','-C',dir,'.']);
   execFileSync('openssl',['enc','-aes-256-cbc','-pbkdf2','-salt','-pass','env:DR_BACKUP_PASSPHRASE','-in',archive,'-out',encrypted]);
   const data=fs.readFileSync(encrypted),sha=crypto.createHash('sha256').update(data).digest('hex');
   if(data.length>50000000) throw new Error(`FAIL-CLOSED: encrypted archive exceeds Appwrite Cloud file limit for ${slug}: ${data.length}`);
   const id=fileId(slug),f=await upsert(bucket.$id,id,data,`${slug}.tar.gz.enc`,'application/octet-stream');
   if(f.$id!==id||Number(f.sizeOriginal)!==data.length) throw new Error(`FAIL-CLOSED: Appwrite reconciliation failed for ${slug}`);
   results.push({slug,status:'ARCHIVED_ENCRYPTED',file_id:id,encrypted_archive_sha256:sha,encrypted_bytes:data.length,version:meta.version,verify_jwt:meta.verify_jwt,ezbr_sha256:meta.ezbr_sha256||null,updated_at:meta.updated_at});
   fs.rmSync(archive,{force:true});fs.rmSync(encrypted,{force:true});
 }
 const manifest={status:'PASS',mode:'DEPLOYED_EDGE_FUNCTION_SOURCE_EVACUATION',source:'Supabase deployed Edge Functions via official CLI download --use-api',project_ref:process.env.SUPABASE_PROJECT_ID,source_functions:expected.length,migrated_functions:results.length,plaintext_source_retained:false,encrypted_with:'AES-256-CBC-PBKDF2',bucket_id:bucket.$id,bucket_name:bucket.name,results};
 fs.writeFileSync(out,JSON.stringify(manifest,null,2),{mode:0o600});
 const md=Buffer.from(JSON.stringify(manifest,null,2));
 const mf='deployed-functions-manifest';
 let saved=await getFile(bucket.$id,mf); saved=saved?await update(bucket.$id,mf,md,'deployed-functions-manifest.json','application/json'):await upload(bucket.$id,mf,md,'deployed-functions-manifest.json','application/json');
 if(saved.$id!==mf||Number(saved.sizeOriginal)!==md.length) throw new Error('FAIL-CLOSED: deployed function manifest reconciliation failed');
 console.log(`PASS: archived encrypted deployed Edge Function sources ${results.length}/${expected.length}`);
})().catch(e=>{console.error('FAIL-CLOSED:',e.message);process.exit(1)})
NODE

node -e "const m=require(process.env.RUNNER_TEMP+'/azaad-deployed-functions/evidence/manifest.json');if(m.status!=='PASS'||m.source_functions<1||m.migrated_functions!==m.source_functions||m.plaintext_source_retained)process.exit(1);console.log('PASS: deployed Edge Function evacuation gate')"
