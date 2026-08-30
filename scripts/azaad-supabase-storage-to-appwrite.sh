#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?Missing SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Missing SUPABASE_SERVICE_ROLE_KEY}"
: "${APPWRITE_ENDPOINT:?Missing APPWRITE_ENDPOINT}"
: "${APPWRITE_PROJECT_ID:?Missing APPWRITE_PROJECT_ID}"
: "${APPWRITE_API_KEY:?Missing APPWRITE_API_KEY}"

export SUPABASE_URL="${SUPABASE_URL%/}"
export APPWRITE_ENDPOINT="${APPWRITE_ENDPOINT%/}"

node <<'NODE'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const supabase = process.env.SUPABASE_URL;
const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const aw = process.env.APPWRITE_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID;
const awKey = process.env.APPWRITE_API_KEY;
const out = path.join(process.env.RUNNER_TEMP || '/tmp', 'azaad-storage-migration');
fs.rmSync(out, {recursive:true, force:true});
fs.mkdirSync(out, {recursive:true, mode:0o700});

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function request(url, options={}, label='request') {
  let last;
  for (let attempt=1; attempt<=4; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      const text = await res.text();
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        await sleep(1000 * attempt);
        continue;
      }
      throw new Error(`${label}: HTTP ${res.status}`);
    } catch (e) {
      last=e;
      if (attempt < 4) await sleep(1000 * attempt); else throw last;
    }
  }
  throw last;
}

async function json(url, options, label) {
  const res = await request(url, options, label);
  return res.json();
}

async function supaList(bucket, prefix='') {
  const rows=[];
  for (let offset=0;;offset+=1000) {
    const body=JSON.stringify({prefix, limit:1000, offset, sortBy:{column:'name', order:'asc'}});
    const data=await json(`${supabase}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
      method:'POST', headers:{Authorization:`Bearer ${supaKey}`, apikey:supaKey, 'Content-Type':'application/json'}, body
    }, `Supabase list ${bucket}/${prefix}`);
    if (!Array.isArray(data) || data.length===0) break;
    rows.push(...data);
    if (data.length<1000) break;
  }
  return rows;
}

async function walkBucket(bucket, prefix='') {
  const entries=await supaList(bucket,prefix);
  const files=[];
  for (const e of entries) {
    if (!e || !e.name) continue;
    const full=prefix ? `${prefix.replace(/\/$/,'')}/${e.name}` : e.name;
    if (e.id) files.push({path:full, id:e.id, metadata:e.metadata||null});
    else files.push(...await walkBucket(bucket, full));
  }
  return files;
}

async function appwriteBuckets() {
  const result=[];
  for (let offset=0;;offset+=100) {
    const data=await json(`${aw}/storage/buckets?limit=100&offset=${offset}`, {
      headers:{'X-Appwrite-Project':project,'X-Appwrite-Key':awKey,'Accept':'application/json'}
    }, 'Appwrite bucket list');
    const rows=data.buckets||[];
    result.push(...rows);
    if (rows.length<100) break;
  }
  return result;
}

function bucketId(name) {
  const safe=name.toLowerCase().replace(/[^a-z0-9._-]/g,'-').replace(/^-+|-+$/g,'').slice(0,24);
  return `${safe || 'bucket'}-${crypto.createHash('sha256').update(name).digest('hex').slice(0,10)}`.slice(0,36);
}
function fileId(bucket, filePath) {
  return crypto.createHash('sha256').update(`${bucket}\0${filePath}`).digest('hex').slice(0,36);
}
function encodedFileName(filePath) {
  // Appwrite stores a file name, not a portable Supabase object path.
  // Encode the original path losslessly and deterministically for reconciliation.
  return filePath.replaceAll('/','__');
}

async function createBucket(id,name) {
  const body={bucketId:id,name,permissions:[],fileSecurity:false,enabled:true,maximumFileSize:30000000000,allowedFileExtensions:[],compression:'none',encryption:true,antivirus:true};
  return json(`${aw}/storage/buckets`, {method:'POST',headers:{'X-Appwrite-Project':project,'X-Appwrite-Key':awKey,'Content-Type':'application/json'},body:JSON.stringify(body)}, `Appwrite create bucket ${name}`);
}

async function upload(bucketId, sourceBucket, f) {
  const url=`${supabase}/storage/v1/object/authenticated/${encodeURIComponent(sourceBucket)}/${f.path.split('/').map(encodeURIComponent).join('/')}`;
  const res=await request(url,{headers:{Authorization:`Bearer ${supaKey}`,apikey:supaKey}},`Supabase download ${sourceBucket}/${f.path}`);
  const bytes=await res.arrayBuffer();
  const fd=new FormData();
  fd.append('fileId',fileId(sourceBucket,f.path));
  fd.append('file',new Blob([bytes],{type:(f.metadata&&f.metadata.mimetype)||'application/octet-stream'}),encodedFileName(f.path));
  const awRes=await request(`${aw}/storage/buckets/${encodeURIComponent(bucketId)}/files`,{method:'POST',headers:{'X-Appwrite-Project':project,'X-Appwrite-Key':awKey},body:fd},`Appwrite upload ${sourceBucket}/${f.path}`);
  return awRes.json();
}

(async()=>{
  const manifest={candidate_sha:process.env.GITHUB_SHA||'unknown',started_at:new Date().toISOString(),buckets:[]};
  const sbRes=await json(`${supabase}/storage/v1/bucket`,{headers:{Authorization:`Bearer ${supaKey}`,apikey:supaKey,'Accept':'application/json'}},'Supabase bucket inventory');
  if(!Array.isArray(sbRes)) throw new Error('Supabase bucket inventory was not an array');
  const awBuckets=await appwriteBuckets();
  for(const b of sbRes){
    const existing=awBuckets.find(x=>x.name===b.name);
    const target=existing || await createBucket(bucketId(b.id||b.name),b.name);
    const files=await walkBucket(b.id);
    const rec={source_bucket:b.id,source_name:b.name,destination_bucket:target.$id,destination_name:target.name,file_count:files.length,uploaded:0,failed:[]};
    manifest.buckets.push(rec);
    for(const f of files){
      try { await upload(target.$id,b.id,f); rec.uploaded++; }
      catch(e){ rec.failed.push({path:f.path,error:e.message}); throw e; }
    }
  }
  manifest.finished_at=new Date().toISOString();
  manifest.status='PASS';
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
  console.log(`PASS: migrated ${manifest.buckets.reduce((n,b)=>n+b.uploaded,0)} storage objects across ${manifest.buckets.length} buckets`);
  console.log(`manifest=${path.join(out,'manifest.json')}`);
})().catch(e=>{ console.error(`FAIL-CLOSED: storage migration stopped: ${e.message}`); process.exit(1); });
NODE
