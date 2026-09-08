from pathlib import Path
import re

path = Path('clinical-assessment.html')
if not path.is_file():
    raise SystemExit('clinical-assessment.html is required')
text = path.read_text(encoding='utf-8')

legacy_api = "https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinical-assessments"
if text.count(legacy_api) != 1:
    raise SystemExit('Expected exactly one legacy clinical assessment API owner before canonicalization')

text = text.replace(
    "const API='https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinical-assessments'; const KEY='sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';",
    "const API='/api/clinical-assessments';",
    1,
)

legacy_token = re.compile(r" const token=async\(\)=>.*?; const tr=", re.S)
text, token_count = legacy_token.subn(" const tr=", text, count=1)
if token_count != 1:
    raise SystemExit(f'Expected exactly one legacy clinical token owner, found {token_count}')

request_pattern = re.compile(r"  async function request\(method,params=\{\},body\)\{.*?\n  \}\n  function renderMeta", re.S)
request_replacement = """  async function request(method,params={},body){
    const u=new URL(API,location.origin);
    Object.entries(params).forEach(([k,v])=>v!==''&&v!=null&&u.searchParams.set(k,v));
    const r=await fetch(u,{method,credentials:'include',headers:{Accept:'application/json','Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined,cache:'no-store'});
    const b=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(b?.error||b?.message||`HTTP ${r.status}`);
    return b;
  }
  function renderMeta"""
text, request_count = request_pattern.subn(request_replacement, text, count=1)
if request_count != 1:
    raise SystemExit(f'Expected exactly one clinical assessment request owner, found {request_count}')

path.write_text(text, encoding='utf-8')
print('[AZAAD build] clinical assessment browser boundary canonicalized to /api/clinical-assessments', flush=True)
