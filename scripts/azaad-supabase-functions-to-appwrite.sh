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
const {execFileSync}=cp; const endpoint=String(process.env.APPWRITE_ENDPOINT).replace(/\/$/,''),project=String(process.env.APPWRITE_PROJECT_ID),key=String(process.env.APPWRITE_API_KEY),root='supabase/functions',out=process.env.RUNNER_TEMP+'/azaad-functions-migration/manifest.json';
const headers={'X-Appwrite-Project':project,'X-Appwrite-Key':key,'Accept':'application/json','Content-Type':'application/json'}; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function req(url,opt={}){for(let i=0;i<3;i++){const r=await fetch(url,opt),t=await r.text();let j;try{j=JSON.parse(t)}catch{j={raw:t}};if(r.ok)return j;if(r.status>=500&&i<2){await sleep(700*(i+1));continue}throw new Error(`${opt.method||'GET'} ${url} -> HTTP ${r.status}: ${JSON.stringify({type:j.type,message:j.message,code:j.code})}`)}}
async function main(){
 // /functions/runtimes is intentionally not used here. The supplied project
 // key is rejected by that discovery endpoint with unauthorized_scope, while
 // the Functions create/deployment API accepts an explicit supported runtime.
 // Current Appwrite Cloud docs list deno-2.0 as an active Cloud runtime.
 const runtimeSlug='deno-2.0';
 const source=fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort(); if(!source.length)throw new Error('FAIL-CLOSED: no Supabase function directories discovered');
 const dest=[];let offset=0;for(;;){const j=await req(`${endpoint}/functions?limit=100&offset=${offset}`,{headers}),b=Array.isArray(j.functions)?j.functions:[];dest.push(...b);if(b.length<100)break;offset+=b.length} const byId=new Map(dest.map(x=>[x.$id,x])); const results=[];
 for(const name of source){const dir=path.join(root,name),entry=fs.existsSync(path.join(dir,'index.ts'))?'index.ts':fs.existsSync(path.join(dir,'index.js'))?'index.js':null;if(!entry)throw new Error(`FAIL-CLOSED: ${name} has no index.ts/index.js`);let fn=byId.get(name);
  if(!fn){const body={functionId:name,name,execute:[],runtime:runtimeSlug,entrypoint:entry,enabled:false,logging:false,deploymentRetention:0};try{fn=await req(`${endpoint}/functions`,{method:'POST',headers,body:JSON.stringify(body)})}catch(e){if(!String(e.message).includes('409'))throw e;fn=await req(`${endpoint}/functions/${encodeURIComponent(name)}`,{headers})}byId.set(name,fn)}
  const archive=path.join(process.env.RUNNER_TEMP,`${name}.tar.gz`);execFileSync('tar',['-czf',archive,'--exclude=.env','--exclude=.env.*','--exclude=node_modules','--exclude=.git','-C',dir,'.']);const sha=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  const form=new FormData();form.append('code',new Blob([fs.readFileSync(archive)],{type:'application/gzip'}),`${name}.tar.gz`);form.append('activate','false');form.append('entrypoint',entry);
  const dep=await req(`${endpoint}/functions/${encodeURIComponent(name)}/deployments`,{method:'POST',headers:{'X-Appwrite-Project':project,'X-Appwrite-Key':key,'Accept':'application/json'},body:form});let current=dep;
  for(let i=0;i<60;i++){current=await req(`${endpoint}/functions/${encodeURIComponent(name)}/deployments/${encodeURIComponent(dep.$id)}`,{headers:{'X-Appwrite-Project':project,'X-Appwrite-Key':key,'Accept':'application/json'}});const status=String(current.status||'').toLowerCase();if(['ready','failed','canceled'].includes(status))break;await sleep(5000)}
  if(String(current.status).toLowerCase()!=='ready')throw new Error(`FAIL-CLOSED: ${name} deployment status=${current.status}`);results.push({id:name,status:'READY',deployment_id:dep.$id,source_archive_sha256:sha,runtime:runtimeSlug,activated:false});
 }
 fs.writeFileSync(out,JSON.stringify({status:'PASS',source_functions:source.length,migrated_functions:results.length,runtime:runtimeSlug,activation_policy:'inactive_until_cutover',results},null,2),{mode:0o600});console.log(`PASS: evacuated ${results.length}/${source.length} Supabase function code packages to Appwrite`)
}main().catch(e=>{console.error('FAIL-CLOSED:',e.message);process.exit(1)})
NODE
node -e "const m=require(process.env.RUNNER_TEMP+'/azaad-functions-migration/manifest.json');if(m.status!=='PASS'||m.source_functions!==m.migrated_functions||!m.migrated_functions)process.exit(1);console.log('PASS: Edge Function evacuation reconciliation gate')"
