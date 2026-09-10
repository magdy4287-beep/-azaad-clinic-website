/* AZAAD CLINIC — Doctor Dashboard Visit Actions — Appwrite/Neon boundary */
(() => {
  'use strict';
  const API='/api/admin-appointments';
  const START='/api/clinical-assessments?action=start-visit';
  const $=id=>document.getElementById(id);
  const tr=(ar,en)=>(document.documentElement.lang||'ar').toLowerCase().startsWith('en')?en:ar;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  async function startVisit(id){const r=await fetch(START,{method:'POST',credentials:'include',cache:'no-store',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({booking_id:id})});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b?.error||b?.message||`HTTP ${r.status}`);return b;}
  async function load(){const r=await fetch(`${API}?from=${encodeURIComponent(new Date().toISOString().slice(0,10))}&to=${encodeURIComponent(new Date().toISOString().slice(0,10))}&limit=200`,{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}});const b=await r.json().catch(()=>({}));return r.ok?(b.appointments||[]):[];}
  function install(){const list=$('scheduleList');if(!list||list.dataset.visitActions)return;list.dataset.visitActions='1';const run=async()=>{const appointments=await load();[...list.querySelectorAll('.row')].forEach(row=>{if(row.querySelector('[data-start-visit]'))return;const code=row.textContent.match(/AZD-[A-Z0-9-]+/)?.[0]||'';const appt=appointments.find(x=>String(x.booking_code||'')===code);if(!appt)return;const b=document.createElement('button');b.type='button';b.dataset.startVisit=appt.id;b.className='tab';b.style.cssText='margin-inline-start:10px;font-weight:800';b.textContent=['checked_in','checked_in_late'].includes(String(appt.status||'').toLowerCase())?`🩺 ${tr('بدء الزيارة','Start Visit')}`:`🚦 ${esc(appt.status||'—')}`;b.onclick=async()=>{if(!['checked_in','checked_in_late'].includes(String(appt.status||'').toLowerCase()))return;try{const result=await startVisit(appt.id);b.textContent=`🟢 ${tr('الزيارة بدأت','Visit Started')}`;b.disabled=true;window.location.href=`clinical-assessment.html?booking_id=${encodeURIComponent(appt.id)}&patient_id=${encodeURIComponent(appt.patient_id||'')}&visit_id=${encodeURIComponent(result.visit?.id||'')}`;}catch(e){alert(e.message)}};row.appendChild(b);});};new MutationObserver(run).observe(list,{childList:true,subtree:true});setTimeout(run,700);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else setTimeout(install,500);
})();
