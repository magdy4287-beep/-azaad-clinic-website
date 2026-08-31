#!/usr/bin/env bash
set -euo pipefail

clean_env() {
  printf '%s' "${1:-}" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

SUPABASE_URL="$(clean_env "${SUPABASE_URL:-}")"
SUPABASE_SERVICE_ROLE_KEY="$(clean_env "${SUPABASE_SERVICE_ROLE_KEY:-}")"
APPWRITE_ENDPOINT="$(clean_env "${APPWRITE_ENDPOINT:-}")"
APPWRITE_PROJECT_ID="$(clean_env "${APPWRITE_PROJECT_ID:-}")"
APPWRITE_API_KEY="$(clean_env "${APPWRITE_API_KEY:-}")"
export SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY APPWRITE_ENDPOINT APPWRITE_PROJECT_ID APPWRITE_API_KEY

: "${SUPABASE_URL:?Missing SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Missing SUPABASE_SERVICE_ROLE_KEY}"
: "${APPWRITE_ENDPOINT:?Missing APPWRITE_ENDPOINT}"
: "${APPWRITE_PROJECT_ID:?Missing APPWRITE_PROJECT_ID}"
: "${APPWRITE_API_KEY:?Missing APPWRITE_API_KEY}"

SUPABASE_URL="${SUPABASE_URL%/}"
if [[ "$SUPABASE_URL" =~ ^https://app\.supabase\.com/dashboard/project/([a-z0-9]+)(/.*)?$ ]]; then
  SUPABASE_URL="https://${BASH_REMATCH[1]}.supabase.co"
elif [[ "$SUPABASE_URL" =~ ^https://([a-z0-9]+)\.supabase\.co(/rest/v1|/storage/v1|/auth/v1)?$ ]]; then
  SUPABASE_URL="https://${BASH_REMATCH[1]}.supabase.co"
fi
export SUPABASE_URL
export APPWRITE_ENDPOINT="${APPWRITE_ENDPOINT%/}"

node <<'NODE'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const cleanEnv = val => (val ? val.trim().replace(/[\r\n]+/g, '') : '');
const supabase = cleanEnv(process.env.SUPABASE_URL);
const supaKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const aw = cleanEnv(process.env.APPWRITE_ENDPOINT);
const project = cleanEnv(process.env.APPWRITE_PROJECT_ID);
const awKey = cleanEnv(process.env.APPWRITE_API_KEY);
if (!supabase || !supaKey || !aw || !project || !awKey) throw new Error('FAIL-CLOSED: required migration environment variable is empty after sanitization');
const out = path.join(process.env.RUNNER_TEMP || '/tmp', 'azaad-storage-migration');
const CHUNK = 5 * 1024 * 1024;
fs.rmSync(out, {recursive:true, force:true});
fs.mkdirSync(out, {recursive:true, mode:0o700});

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function request(url, options={}, label='request') {
  let last;
  for (let attempt=1; attempt<=4; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if ((res.status === 429 || res.status >= 500) && attempt < 4) { await sleep(1000 * attempt); continue; }
      let detail='';
      try { const raw=await res.text(); try { const parsed=JSON.parse(raw); detail=JSON.stringify({type:parsed.type, message:parsed.message, code:parsed.code}); } catch { detail=raw.slice(0,500); } } catch {}
      throw new Error(`${label}: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
    } catch (e) {
      last=e;
      if (attempt < 4 && !String(e.message||'').includes('HTTP ')) await sleep(1000 * attempt);
      else if (attempt < 4 && (String(e.message||'').includes('HTTP 429') || String(e.message||'').match(/HTTP 5\d\d/))) await sleep(1000 * attempt);
      else if (attempt < 4 && String(e.message||'').includes('HTTP ')) throw e;
      else if (attempt < 4) await sleep(1000 * attempt);
      else throw last;
    }
  }
  throw last;
}
async function getMaybe(url, options={}, label='request') {
  const res = await fetch(url, options);
  if (res.status === 404) return null;
  if (!res.ok) { let detail=''; try { const raw=await res.text(); detail=raw.slice(0,500); } catch {} throw new Error(`${label}: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`); }
  return res;
}
async function json(url, options, label) { const res=await request(url, options, label); return res.json(); }

function supabaseHeaders() { const h={'apikey':supaKey,'Accept':'application/json'}; if(!supaKey.startsWith('sb_secret_')) h.Authorization=`Bearer ${supaKey}`; return h; }
function headers() { return {'X-Appwrite-Project':project,'X-Appwrite-Key':awKey,'Accept':'application/json'}; }
function fileId(bucket,filePath) { return crypto.createHash('sha256').update(`${bucket}\0${filePath}`).digest('hex').slice(0,36); }
function bucketId(name) { const safe=name.toLowerCase().replace(/[^a-z0-9._-]/g,'-').replace(/^-+|-+$/g,'').slice(0,24); return `${safe || 'bucket'}-${crypto.createHash('sha256').update(name).digest('hex').slice(0,10)}`.slice(0,36); }
function fileName(filePath) { const base=path.posix.basename(filePath)||'file'; const suffix='-'+crypto.createHash('sha256').update(filePath).digest('hex').slice(0,10); return (base.length+suffix.length<=255?base:base.slice(0,255-suffix.length))+suffix; }
function folderName(filePath) { const dir=path.posix.dirname(filePath); return dir==='.'?'':dir; }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

async function supaList(bucket,prefix='') {
  const rows=[];
  for(let offset=0;;offset+=1000){
    const body=JSON.stringify({prefix,limit:1000,offset,sortBy:{column:'name',order:'asc'}});
    const data=await json(`${supabase}/storage/v1/object/list/${encodeURIComponent(bucket)}`,{method:'POST',headers:{...supabaseHeaders(),'Content-Type':'application/json'},body},`Supabase list ${bucket}/${prefix}`);
    if(!Array.isArray(data)||data.length===0)break;
    rows.push(...data); if(data.length<1000)break;
  }
  return rows;
}
async function walkBucket(bucket,prefix=''){
  const entries=await supaList(bucket,prefix); const files=[];
  for(const e of entries){
    if(!e||!e.name)continue;
    const full=prefix?`${prefix.replace(/\/$/,'')}/${e.name}`:e.name;
    if(e.id)files.push({path:full,id:e.id,metadata:e.metadata||null}); else files.push(...await walkBucket(bucket,full));
  }
  return files;
}
async function appwriteBuckets(){
  const result=[];
  for(let offset=0;;offset+=100){
    const data=await json(`${aw}/storage/buckets?limit=100&offset=${offset}`,{headers:headers()},'Appwrite bucket list');
    const rows=data.buckets||[]; result.push(...rows); if(rows.length<100)break;
  }
  return result;
}
async function createBucket(id,name){
  // Appwrite Cloud REST documents a 5 GB maximum file-size limit for buckets.
  // Use the decimal platform limit rather than 5 GiB to avoid exceeding the service validator.
  const body={bucketId:id,name,permissions:[],fileSecurity:false,enabled:true,maximumFileSize:5000000000,allowedFileExtensions:[],compression:'none',encryption:false,antivirus:false,transformations:false};
  return json(`${aw}/storage/buckets`,{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify(body)},`Appwrite create bucket ${name}`);
}
async function uploadChunks(bucketIdValue,f,bytes,mime){
  const id=fileId(f.sourceBucket,f.path); const name=fileName(f.path); const folder=folderName(f.path); const total=bytes.byteLength; let response;
  for(let start=0;start<total;start+=CHUNK){
    const end=Math.min(start+CHUNK,total)-1; const part=bytes.slice(start,end+1); const form=new FormData();
    if(start===0)form.append('fileId',id); form.append('file',new Blob([part],{type:mime}),name); form.append('folder',folder); form.append('permissions[]','read("any")');
    const h={...headers(),'Content-Range':`bytes ${start}-${end}/${total}`}; if(start>0)h['X-Appwrite-ID']=id;
    response=await request(`${aw}/storage/buckets/${encodeURIComponent(bucketIdValue)}/files`,{method:'POST',headers:h,body:form},`Appwrite upload ${f.sourceBucket}/${f.path} ${start}-${end}`);
  }
  return response?response.json():null;
}
async function verifyDestination(bucketIdValue,f,expectedSha,expectedSize){
  const id=fileId(f.sourceBucket,f.path); const meta=await getMaybe(`${aw}/storage/buckets/${encodeURIComponent(bucketIdValue)}/files/${encodeURIComponent(id)}`,{headers:headers()},`Appwrite get ${f.path}`);
  if(!meta)return false; const info=await meta.json(); if(Number(info.sizeOriginal)!==expectedSize)throw new Error(`reconciliation size mismatch for ${f.path}`);
  const content=await(await request(`${aw}/storage/buckets/${encodeURIComponent(bucketIdValue)}/files/${encodeURIComponent(id)}/download`,{headers:headers()},`Appwrite download ${f.path}`)).arrayBuffer();
  const actual=sha256(Buffer.from(content)); if(actual!==expectedSha)throw new Error(`reconciliation checksum mismatch for ${f.path}`); return true;
}

(async()=>{
  const manifest={candidate_sha:process.env.GITHUB_SHA||'unknown',started_at:new Date().toISOString(),buckets:[],source_deleted:false,supabase_url:supabase};
  const inventoryResponse=await fetch(`${supabase}/storage/v1/bucket`,{headers:supabaseHeaders()});
  if(inventoryResponse.status===404)throw new Error(`Supabase Storage bucket inventory: HTTP 404 (normalized SUPABASE_URL=${supabase}; expected project API URL https://<project-ref>.supabase.co)`);
  if(!inventoryResponse.ok)throw new Error(`Supabase Storage bucket inventory: HTTP ${inventoryResponse.status}`);
  const sbRes=await inventoryResponse.json(); if(!Array.isArray(sbRes))throw new Error('Supabase bucket inventory was not an array');
  const awBuckets=await appwriteBuckets();
  for(const b of sbRes){
    const existing=awBuckets.find(x=>x.name===b.name); const target=existing||await createBucket(bucketId(b.id||b.name),b.name); const files=await walkBucket(b.id);
    const rec={source_bucket:b.id,source_name:b.name,destination_bucket:target.$id,destination_name:target.name,file_count:files.length,uploaded:0,verified:0,failed:[]}; manifest.buckets.push(rec);
    for(const item of files){
      const f={...item,sourceBucket:b.id};
      try{
        const url=`${supabase}/storage/v1/object/authenticated/${encodeURIComponent(b.id)}/${f.path.split('/').map(encodeURIComponent).join('/')}`;
        const res=await request(url,{headers:supabaseHeaders()},`Supabase download ${b.id}/${f.path}`); const bytes=Buffer.from(await res.arrayBuffer()); const expectedSha=sha256(bytes); const expectedSize=bytes.length;
        const already=await getMaybe(`${aw}/storage/buckets/${encodeURIComponent(target.$id)}/files/${encodeURIComponent(fileId(b.id,f.path))}`,{headers:headers()},`Appwrite existence ${f.path}`);
        if(!already){await uploadChunks(target.$id,f,bytes,(f.metadata&&f.metadata.mimetype)||'application/octet-stream');rec.uploaded++;}
        await verifyDestination(target.$id,f,expectedSha,expectedSize); rec.verified++;
      }catch(e){rec.failed.push({path:f.path,error:e.message});throw e;}
    }
  }
  manifest.finished_at=new Date().toISOString(); manifest.status='PASS'; fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
  console.log(`PASS: verified ${manifest.buckets.reduce((n,b)=>n+b.verified,0)} storage objects across ${manifest.buckets.length} buckets`); console.log('PASS: source Supabase storage was not deleted');
})().catch(e=>{console.error(`FAIL-CLOSED: storage migration stopped: ${e.message}`);process.exit(1);});
NODE
