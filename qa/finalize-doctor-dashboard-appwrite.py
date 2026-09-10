from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
JS=ROOT/'doctor-dashboard.js'
HTML=ROOT/'doctor-dashboard.html'

CANONICAL=r'''(() => {
  'use strict';
  if(window.__AZAAD_DOCTOR_DASHBOARD__)return;
  window.__AZAAD_DOCTOR_DASHBOARD__=true;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const tr=(ar,en)=>String(document.documentElement.lang||'ar').toLowerCase().startsWith('en')?en:ar;
  let identity=null,appointments=[];
  const today=()=>new Date().toISOString().slice(0,10);
  async function json(url,opt={}){const r=await fetch(url,{credentials:'include',cache:'no-store',headers:{Accept:'application/json','Content-Type':'application/json'},...opt});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||b.message||`HTTP ${r.status}`);return b;}
  async function bootAuth(){const b=await json('/api/admin-auth');identity=b;if(String(b.staff?.role||'').toUpperCase()!=='DOCTOR')throw Error('Doctor role is required.');if(!b.staff?.doctor_id)throw Error('Doctor identity is not linked to a doctor record.');return b.staff;}
  function row(x){const p=x.patient||{};const ready=['checked_in','checked_in_late'].includes(String(x.status||'').toLowerCase());const paid=String(x.payment_status||'').toLowerCase()==='paid';return `<div class="row"><div style="flex:1;min-width:230px"><strong>👤 ${esc(p.patient_name||x.patient_name||'—')}</strong><div class="muted">${esc(p.mrn||'')} · ${esc(x.booking_code||'')}</div><div class="muted">📅 ${esc(x.appointment_date||'—')} · ⏰ ${esc(String(x.appointment_time||'').slice(0,5)||'—')}</div><div class="toolbar" style="margin-top:6px"><span class="status-pill ${ready?'checked':'unpaid'}">${ready?'🟢 checked-in':'🚦 '+esc(x.status||'pending')}</span><span class="status-pill ${paid?'paid':'unpaid'}">💳 ${paid?'paid':'unpaid'}</span></div></div><div class="toolbar"><button class="btn primary" data-open-patient="${esc(x.patient_id||'')}" data-booking="${esc(x.id)}">👤 ${tr('فتح الملف','Open Patient')}</button><button class="btn success" data-start="${esc(x.id)}" ${(!ready||!paid)?'disabled':''}>🩺 ${tr('ابدأ الجلسة','Start Visit')}</button></div></div>`;}
  async function load(){const staff=await bootAuth();const date=$('scheduleDate')?.value||today();const b=await json(`/api/admin-appointments?from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}&limit=200`);appointments=(b.appointments||[]).filter(x=>String(x.doctor_id||'')===String(staff.doctor_id));$('scheduleList').innerHTML=appointments.length?appointments.map(row).join(''):`<div class="notice">${tr('لا توجد مواعيد للطبيب لهذا اليوم.','No appointments for this doctor today.')}</div>`;const patients=[...new Map(appointments.map(x=>[x.patient_id,x.patient||{id:x.patient_id,patient_name:x.patient_name,mrn:x.mrn,patient_phone:x.patient_phone}]).filter(x=>x[0])).values()];$('patientsList').innerHTML=patients.length?patients.map(p=>`<div class="row"><div><strong>👤 ${esc(p.patient_name||'—')}</strong><div class="muted">${esc(p.mrn||'')} · ${esc(p.patient_phone||'')}</div></div><button class="btn primary" data-open-patient="${esc(p.id)}">${tr('فتح الملف','Open Patient')}</button></div>`).join(''):`<div class="notice">${tr('لا يوجد مرضى مرتبطون اليوم.','No patients linked today.')}</div>`;$('todayCount').textContent=appointments.length;$('patientCount').textContent=patients.length;$('status').textContent='🟢';wire();}
  function wire(){document.querySelectorAll('[data-open-patient]').forEach(b=>{if(b.dataset.wired)return;b.dataset.wired='1';b.onclick=()=>location.href=`clinical-assessment.html?patient_id=${encodeURIComponent(b.dataset.openPatient)}${b.dataset.booking?`&booking_id=${encodeURIComponent(b.dataset.booking)}`:''}`});document.querySelectorAll('[data-start]').forEach(b=>{if(b.dataset.wired)return;b.dataset.wired='1';b.onclick=async()=>{b.disabled=true;try{const r=await json('/api/clinical-assessments?action=start-visit',{method:'POST',body:JSON.stringify({booking_id:b.dataset.start})});const a=appointments.find(x=>String(x.id)===String(b.dataset.start));location.href=`clinical-assessment.html?booking_id=${encodeURIComponent(b.dataset.start)}&patient_id=${encodeURIComponent(a?.patient_id||'')}&visit_id=${encodeURIComponent(r.visit?.id||'')}`;}catch(e){b.disabled=false;alert(e.message)}}});}
  async function start(){try{await load()}catch(e){$('status').textContent='🔴';const err=$('error');if(err){err.hidden=false;err.textContent=`❌ ${e.message}`}}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
'''
JS.write_text(CANONICAL,encoding='utf-8')
html=HTML.read_text(encoding='utf-8')
html,n=re.subn(r'<script\b[^>]*\bsrc=["\'][^"\']*doctor-assessment-load-fallback\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\s*','',html,flags=re.I)
if n!=1: raise SystemExit(f'FAIL-CLOSED: expected exactly one retired doctor fallback script in doctor-dashboard.html, found {n}')
HTML.write_text(html,encoding='utf-8')
for marker in ('SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','supabase.co','functions/v1/','createClient('):
    if marker.lower() in CANONICAL.lower(): raise SystemExit(f'FAIL-CLOSED: retired marker remained: {marker}')
print('[AZAAD doctor dashboard] PASS: canonical Appwrite/Neon doctor runtime written; legacy assessment fallback removed')
