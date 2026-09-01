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
async function main(){
 const source=fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
 if(source.length!==16) throw new Error(`FAIL-CLOSED: expected 16 source functions, discovered ${source.length}`);
 const bucketId='azaad-edge-functions-dr';
 let bucket;
 try{bucket=await req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}`,{headers});}
 catch(e){if(!String(e.message).includes('404')) throw e; try{bucket=await req(`${endpoint}/storage/buckets`,{method:'POST',headers,body:JSON.stringify({bucketId,name:'AZAAD Edge Functions DR',fileSecurity:false,enabled:true})});}catch(e2){if(!String(e2.message).includes('409')) throw e2; bucket=await req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}`,{headers});}}
 if(bucket.$id!==bucketId) throw new Error(`FAIL-CLOSED: unexpected DR bucket id ${bucket.$id}`);
 const results=[];
 for(const name of source){
   const dir=path.join(root,name),entry=fs.existsSync(path.join(dir,'index.ts'))?'index.ts':fs.existsSync(path.join(dir,'index.js'))?'index.js':null;
   if(!entry) throw new Error(`FAIL-CLOSED: ${name} has no index.ts/index.js`);
   const archive=path.join(process.env.RUNNER_TEMP,`${name}.tar.gz`);
   execFileSync('tar',['-czf',archive,'--exclude=.env','--exclude=.env.*','--exclude=node_modules','--exclude=.git','-C',dir,'.']);
   const data=fs.readFileSync(archive),sha=crypto.createHash('sha256').update(data).digest('hex');
   const fileId=`fn-${name}`;
   let file;
   try{file=await req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}`,{headers});}
   catch(e){if(!String(e.message).includes('404')) throw e;file=await upload(bucketId,fileId,data,`${name}.tar.gz`,'application/gzip');}
   if(file.$id!==fileId) throw new Error(`FAIL-CLOSED: unexpected file id for ${name}: ${file.$id}`);
   results.push({id:name,status:'ARCHIVED',entrypoint:entry,file_id:fileId,source_archive_sha256:sha,bytes:data.length});
 }
 const manifest={status:'PASS',mode:'FUNCTION_SOURCE_EVACUATION',bucket_id:bucketId,source_functions:source.length,migrated_functions:results.length,activation_policy:'not_applicable_source_archive',results};
 fs.writeFileSync(out,JSON.stringify(manifest,null,2),{mode:0o600});
 const mdata=Buffer.from(JSON.stringify(manifest,null,2));
 try{await req(`${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/fn-manifest`,{headers});}
 catch(e){if(!String(e.message).includes('404')) throw e;await upload(bucketId,'fn-manifest',mdata,'manifest.json','application/json');}
 console.log(`PASS: archived ${results.length}/${source.length} Supabase Edge Function source trees to Appwrite Storage`);
}
main().catch(e=>{console.error('FAIL-CLOSED:',e.message);process.exit(1)})
NODE
node -e "const m=require(process.env.RUNNER_TEMP+'/azaad-functions-migration/manifest.json');if(m.status!=='PASS'||m.source_functions!==16||m.migrated_functions!==16)process.exit(1);console.log('PASS: Edge Function source evacuation reconciliation gate')"
