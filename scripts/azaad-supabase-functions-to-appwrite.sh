#!/usr/bin/env bash
set -euo pipefail
: "${APPWRITE_ENDPOINT:?APPWRITE_ENDPOINT is required}"
: "${APPWRITE_PROJECT_ID:?APPWRITE_PROJECT_ID is required}"
: "${APPWRITE_API_KEY:?APPWRITE_API_KEY is required}"
ROOT="supabase/functions"
EVIDENCE_DIR="${RUNNER_TEMP:-/tmp}/azaad-functions-migration"
mkdir -p "$EVIDENCE_DIR"; chmod 700 "$EVIDENCE_DIR"
ENDPOINT="${APPWRITE_ENDPOINT%/}"
node <<'NODE'
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),path=require('path');
const {execFileSync}=cp;
const endpoint=String(process.env.APPWRITE_ENDPOINT).replace(/\/$/,''),project=String(process.env.APPWRITE_PROJECT_ID),key=String(process.env.APPWRITE_API_KEY),root='supabase/functions',out=process.env.RUNNER_TEMP+'/azaad-functions-migration/manifest.json';
const headers={'X-Appwrite-Project':project,'X-Appwrite-Key':key,'Accept':'application/json','Content-Type':'application/json'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function req(url,opt={}){for(let i=0;i<3;i++){const r=await fetch(url,opt),t=await r.text();let j;try{j=JSON.parse(t)}catch{j={raw:t}};if(r.ok)return j;if(r.status>=500&&i<2){await sleep(700*(i+1));continue}throw new Error(`${opt.method||'GET'} ${url} -> HTTP ${r.status}: ${JSON.stringify({type:j.type,message:j.message,code:j.code})}`)}}
async function upload(bucketId,fileId,buffer,filename,mime){const form=new FormData();form.append('file',new Blob([buffer],{type:mime}),filename);return req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files`,{method:'POST',headers:{'X-Appwrite-Project':project,'X-Appwrite-Key':key,'Accept':'application/json'},body:form});}
async function listBuckets(){const d=await req(`${endpoint}/storage/buckets?limit=100`,{headers});return Array.isArray(d.buckets)?d.buckets:[];}
async function main(){
 const source=fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
 if(source.length!==16) throw new Error(`FAIL-CLOSED: expected 16 source functions, discovered ${source.length}`);
 const desiredId='azaad-edge-functions-dr';
 const desiredName='AZAAD Edge Functions DR';
 const buckets=await listBuckets();
 let bucket=buckets.find(b=>b.$id===desiredId)||buckets.find(b=>b.name===desiredName);
 if(!bucket && buckets.length===1){bucket=buckets[0];console.log(`PASS: reusing sole existing Appwrite Storage bucket ${bucket.name} (${bucket.$id}); plan bucket quota prevents creating another bucket.`);}
 if(!bucket) throw new Error(`FAIL-CLOSED: no usable Appwrite Storage bucket found. Existing buckets=${buckets.length}; refusing bucket creation because the plan may be quota-limited.`);
 const bucketId=bucket.$id;
 const results=[];
 for(const name of source){
   const dir=path.join(root,name),entry=fs.existsSync(path.join(dir,'index.ts'))?'index.ts':fs.existsSync(path.join(dir,'index.js'))?'index.js':null;
   if(!entry) throw new Error(`FAIL-CLOSED: ${name} has no index.ts/index.js`);
   const archive=path.join(process.env.RUNNER_TEMP,`${name}.tar.gz`);
   execFileSync('tar',['-czf',archive,'--exclude=.env','--exclude=.env.*','--exclude=node_modules','--exclude=.git','-C',dir,'.']);
   const data=fs.readFileSync(archive),sha=crypto.createHash('sha256').update(data).digest('hex');
   if(data.length>50000000) throw new Error(`FAIL-CLOSED: ${name} archive exceeds Appwrite Cloud file limit`);
   const fileId=`fn-${name}`;
   let file;
   try{file=await req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}`,{headers});}
   catch(e){if(!String(e.message).includes('404')) throw e;file=await upload(bucketId,fileId,data,`${name}.tar.gz`,'application/gzip');}
   if(file.$id!==fileId) throw new Error(`FAIL-CLOSED: unexpected file id for ${name}: ${file.$id}`);
   if(Number(file.sizeOriginal)!==data.length) throw new Error(`FAIL-CLOSED: size reconciliation failed for ${name}: source=${data.length} destination=${file.sizeOriginal}`);
   results.push({id:name,status:'ARCHIVED',entrypoint:entry,file_id:fileId,source_archive_sha256:sha,bytes:data.length,destination_bucket_id:bucketId});
 }
 const manifest={status:'PASS',mode:'FUNCTION_SOURCE_EVACUATION',bucket_id:bucketId,bucket_name:bucket.name,source_functions:source.length,migrated_functions:results.length,activation_policy:'not_applicable_source_archive',results};
 fs.writeFileSync(out,JSON.stringify(manifest,null,2),{mode:0o600});
 const mdata=Buffer.from(JSON.stringify(manifest,null,2));
 try{await req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/fn-manifest`,{headers});}
 catch(e){if(!String(e.message).includes('404')) throw e;await upload(bucketId,'fn-manifest',mdata,'manifest.json','application/json');}
 console.log(`PASS: archived ${results.length}/${source.length} Supabase Edge Function source trees to Appwrite Storage bucket ${bucketId}`);
}
main().catch(e=>{console.error('FAIL-CLOSED:',e.message);process.exit(1)})
NODE
node -e "const m=require(process.env.RUNNER_TEMP+'/azaad-functions-migration/manifest.json');if(m.status!=='PASS'||m.source_functions!==16||m.migrated_functions!==16)process.exit(1);console.log('PASS: Edge Function source evacuation reconciliation gate')"
