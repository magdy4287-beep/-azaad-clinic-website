from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'scheduling-v2.js'
text=path.read_text(encoding='utf-8')
if text.count("const client = () => window.AZAAD?.supabase || null;")!=1: raise SystemExit('FAIL-CLOSED: scheduling-v2 legacy client marker count != 1')
if text.count("async function db(table,columns='*',filter)")!=1: raise SystemExit('FAIL-CLOSED: scheduling-v2 db marker count != 1')
if text.count("async function invoke(action,body)")!=1: raise SystemExit('FAIL-CLOSED: scheduling-v2 invoke marker count != 1')
old="""  const client = () => window.AZAAD?.supabase || null;
  async function db(table,columns='*',filter){ const c=client(); if(!c) throw Error('Supabase client غير متاح.'); let q=c.from(table).select(columns); if(filter) q=filter(q); const {data,error}=await q; if(error) throw error; return data||[]; }
  async function invoke(action,body){ const c=client(); if(!c) throw Error('Supabase client غير متاح.'); const {data,error}=await c.functions.invoke('azaad-appointments-actions',{body:{action,...body}}); if(error) throw error; if(data?.error) throw Error(data.error); return data; }
"""
new="""  const API='/api/admin-appointments?resource=scheduling';
  async function api(method,params={},body){ const u=new URL(API,window.location.origin); Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v));}); const r=await fetch(u.toString(),{method,credentials:'include',cache:'no-store',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}); let p={};try{p=await r.json()}catch{} if(!r.ok)throw Error(p.error||`HTTP ${r.status}`);return p; }
  async function db(table,columns='*',filter){ const [from,to]=range(); const p=await api('GET',{table,from,to}); return Array.isArray(p.rows)?p.rows:[]; }
  async function invoke(action,body){ return api('POST',{}, {action,...body}); }
"""
if old not in text: raise SystemExit('FAIL-CLOSED: expected legacy scheduling helper block not found')
text=text.replace(old,new,1)
old_patient="""  async function patientSearch(v){const q=String(v||'').trim();if(!q)return[];return db('clinic_patients','id,mrn,patient_name,patient_phone,active',x=>x.eq('active',true).or(`mrn.ilike.%${q}%,patient_name.ilike.%${q}%,patient_phone.ilike.%${q}%`).limit(12));}
"""
new_patient="""  async function patientSearch(v){const q=String(v||'').trim();if(!q)return[];const p=await api('GET',{table:'patients',q});return Array.isArray(p.rows)?p.rows:[];}
"""
if old_patient not in text: raise SystemExit('FAIL-CLOSED: expected legacy patient search block not found')
text=text.replace(old_patient,new_patient,1)
text=text.replace("  async function refresh(){root();const [from,to]=range();try{", "  async function refresh(){root();const [from,to]=range();try{")
if any(x in text for x in ("window.AZAAD?.supabase","functions.invoke('azaad-appointments-actions'","supabase client غير متاح","supabase-js")): raise SystemExit('FAIL-CLOSED: Supabase runtime marker survived scheduling-v2 transform')
path.write_text(text,encoding='utf-8')
print('PASS: Scheduling V2 browser runtime uses Appwrite session cookie + consolidated admin-appointments API')