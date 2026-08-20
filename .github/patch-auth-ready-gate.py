from pathlib import Path
import re

# Expose the canonical admin restore promise so dependent admin modules can
# wait for authentication instead of racing Supabase initialization.
admin = Path("admin.js")
text = admin.read_text(encoding="utf-8")
needle = "      await restoreSession();"
replacement = "      window.AZAAD_AUTH_READY = restoreSession();\n      await window.AZAAD_AUTH_READY;"
if needle not in text:
    raise SystemExit("Expected admin startup restore call was not found")
text = text.replace(needle, replacement, 1)
admin.write_text(text, encoding="utf-8")

ops = Path("azaad-operations-control-center.js")
text = ops.read_text(encoding="utf-8")

old_rpc = "async function rpc(name,args={}){ const c=getClient(); if(!c) throw Error('Supabase client unavailable'); const r=await c.rpc(name,args); if(r.error) throw r.error; return r.data; }"
new_rpc = """async function rpc(name,args={}){\n    const bearer=window.AZAAD?.state?.session?.access_token||sessionStorage.getItem('azaad_admin_token')||'';\n    if(!bearer) throw Error('Admin authorization token is unavailable.');\n    const r=await fetch(`${URL}/rest/v1/rpc/${encodeURIComponent(name)}`,{method:'POST',cache:'no-store',headers:{Accept:'application/json',Authorization:`Bearer ${bearer}`,apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})});\n    const data=await r.json().catch(()=>null);\n    if(!r.ok) throw Error(data?.message||data?.error||`HTTP ${r.status}`);\n    return data;\n  }"""
if old_rpc not in text:
    raise SystemExit("Expected operations RPC implementation was not found")
text = text.replace(old_rpc, new_rpc, 1)

old_table = "async function table(name,select,opts={}){ const c=getClient(); if(!c) throw Error('Supabase client unavailable'); let q=c.from(name).select(select); if(opts.eq) for(const [k,v] of Object.entries(opts.eq)) q=q.eq(k,v); if(opts.gte) q=q.gte(opts.gte[0],opts.gte[1]); if(opts.lte) q=q.lte(opts.lte[0],opts.lte[1]); const r=await q; if(r.error) throw r.error; return r.data||[]; }"
new_table = """async function table(name,select,opts={}){\n    const bearer=window.AZAAD?.state?.session?.access_token||sessionStorage.getItem('azaad_admin_token')||'';\n    if(!bearer) throw Error('Admin authorization token is unavailable.');\n    const params=new URLSearchParams({select});\n    if(opts.eq) for(const [k,v] of Object.entries(opts.eq)) params.set(k,`eq.${v}`);\n    if(opts.gte) params.set(opts.gte[0],`gte.${opts.gte[1]}`);\n    if(opts.lte) params.set(opts.lte[0],`lte.${opts.lte[1]}`);\n    const r=await fetch(`${URL}/rest/v1/${encodeURIComponent(name)}?${params.toString()}`,{method:'GET',cache:'no-store',headers:{Accept:'application/json',Authorization:`Bearer ${bearer}`,apikey:KEY}});\n    const data=await r.json().catch(()=>[]);\n    if(!r.ok) throw Error(data?.message||data?.error||`HTTP ${r.status}`);\n    return Array.isArray(data)?data:[];\n  }"""
if old_table not in text:
    raise SystemExit("Expected operations table implementation was not found")
text = text.replace(old_table, new_table, 1)

old_boot = "async function boot(){ try { addStyles(); wire(); await load(); } catch(e) {"
new_boot = """async function boot(){\n    try {\n      if(window.AZAAD_AUTH_READY) {\n        const restored=await window.AZAAD_AUTH_READY;\n        if(!restored) return;\n      } else {\n        const deadline=Date.now()+15000;\n        while(Date.now()<deadline && !window.AZAAD?.state?.session?.access_token && !sessionStorage.getItem('azaad_admin_token')) await new Promise(resolve=>setTimeout(resolve,100));\n        if(!window.AZAAD?.state?.session?.access_token && !sessionStorage.getItem('azaad_admin_token')) return;\n      }\n      addStyles(); wire(); await load();\n    } catch(e) {"""
if old_boot not in text:
    raise SystemExit("Expected operations boot implementation was not found")
text = text.replace(old_boot, new_boot, 1)
ops.write_text(text, encoding="utf-8")
print("Admin auth readiness is now a dependency of the operations control center; RPC/table calls use the verified bearer token.")
