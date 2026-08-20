from pathlib import Path
import re

path = Path("frontdesk-workflow.js")
if not path.exists():
    raise SystemExit("frontdesk-workflow.js not found")

text = path.read_text(encoding="utf-8")

old_token = "const token=()=>window.AZAAD?.state?.session?.access_token||'';"
new_token = "const token=()=>window.AZAAD?.state?.session?.access_token||sessionStorage.getItem('azaad_admin_token')||'';"
if old_token in text:
    text = text.replace(old_token, new_token, 1)

old_call = "async function call(action,body,method='POST'){const r=await fetch(`${API}?action=${encodeURIComponent(action)}`,{method,headers:{Accept:'application/json',Authorization:`Bearer ${token()}`,apikey:KEY,'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(body||{})});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`HTTP ${r.status}`);return b}"
new_call = """async function call(action,body,method='POST'){
    const request = async (bearer) => fetch(`${API}?action=${encodeURIComponent(action)}`,{
      method,
      headers:{Accept:'application/json',Authorization:`Bearer ${bearer}`,apikey:KEY,'Content-Type':'application/json'},
      body:method==='GET'?undefined:JSON.stringify(body||{}),
      cache:'no-store'
    });
    let bearer = token();
    if(!bearer) throw Error('Admin authorization token is unavailable.');
    let r = await request(bearer);
    if(r.status===401){
      try{
        const client = window.AZAAD?.supabase;
        const refreshed = await client?.auth?.refreshSession();
        const refreshedToken = refreshed?.data?.session?.access_token;
        if(refreshedToken){
          bearer = refreshedToken;
          try{sessionStorage.setItem('azaad_admin_token', bearer);}catch(_){ }
          r = await request(bearer);
        }
      }catch(_){ }
    }
    const b=await r.json().catch(()=>({}));
    if(!r.ok) throw Error(b.error||`HTTP ${r.status}`);
    return b;
  }"""
if old_call in text:
    text = text.replace(old_call, new_call, 1)
else:
    raise SystemExit("Expected frontdesk call implementation was not found")

path.write_text(text, encoding="utf-8")
print("Frontdesk auth bridge patched: session token + reload fallback + 401 refresh")
