import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=process.env.AZAAD_STATIC_ROOT||process.cwd();
const port=Number(process.env.PORT||4173);

function safePath(urlPath){
  const decoded=decodeURIComponent(urlPath.split('?')[0]);
  const rel=decoded.replace(/^\/+/, '');
  const resolved=path.resolve(root,rel);
  if(resolved!==root&&!resolved.startsWith(root+path.sep))return null;
  return resolved;
}

async function invokeApi(req,res,pathname){
  const name=pathname.slice('/api/'.length).replace(/\.js$/,'');
  if(!/^[A-Za-z0-9_-]+$/.test(name))return false;
  const file=path.resolve(root,'api',`${name}.js`);
  try{await fs.access(file);}catch{return false;}
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  const body=Buffer.concat(chunks);
  const origin=`http://${req.headers.host||`127.0.0.1:${port}`}`;
  const headers=new Headers();
  for(const [key,value] of Object.entries(req.headers)){if(value===undefined)continue;headers.set(key,Array.isArray(value)?value.join(', '):value);}
  if(!headers.has('origin'))headers.set('origin',origin);
  const request=new Request(`${origin}${req.url}`,{method:req.method,headers,body:req.method==='GET'||req.method==='HEAD'?undefined:body});
  const module=await import(pathToFileURL(file).href+`?t=${Date.now()}`);
  const response=await module.default(request);
  res.statusCode=response.status;
  response.headers.forEach((value,key)=>res.setHeader(key,value));
  const bytes=new Uint8Array(await response.arrayBuffer());
  res.end(Buffer.from(bytes));
  return true;
}

const server=http.createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url||'/',`http://${req.headers.host||`127.0.0.1:${port}`}`).pathname;
    if(pathname.startsWith('/api/')){
      if(await invokeApi(req,res,pathname))return;
    }
    let file=safePath(pathname);
    if(!file){res.statusCode=400;return res.end('Bad path');}
    try{const stat=await fs.stat(file);if(stat.isDirectory())file=path.join(file,'index.html');}catch{}
    try{
      const data=await fs.readFile(file);
      const ext=path.extname(file).toLowerCase();
      const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
      res.setHeader('content-type',types[ext]||'application/octet-stream');
      res.end(data);
    }catch{res.statusCode=404;res.end('Not found');}
  }catch(error){console.error('local-vercel-runtime failure',error);res.statusCode=500;res.end('Runtime failure');}
});
server.listen(port,'127.0.0.1',()=>console.log(`AZAAD local Vercel-compatible runtime listening on ${port}`));
