/* AZAAD CLINIC — Doctor Dashboard Visit Actions V1 */
(() => {
  'use strict';
  const API='https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-doctor-dashboard';
  const START='https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-doctor-start-visit';
  const KEY='sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const $=id=>document.getElementById(id);
  const tr=(ar,en)=>(document.documentElement.lang||'ar').toLowerCase().startsWith('en')?en:ar;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const token=()=>window.supabase?.auth?.getSession?null:null;
  const session=async()=>window.AZAAD?.state?.session||((await window.supabase?.auth?.getSession?.())?.data?.session||null);
  async function startVisit(id){const s=await session();if(!s?.access_token)throw Error(tr('جلسة الطبيب غير موجودة أو منتهية.','Doctor session is missing or expired.'));const r=await fetch(START,{method:'POST',headers:{Accept:'application/json',Authorization:`Bearer ${s.access_token}`,apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({booking_id:id})});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b?.error||b?.message||`HTTP ${r.status}`);return b;}
  async function load(){const s=await session();if(!s?.access_token)return;const r=await fetch(`${API}?date=${new Date().toISOString().slice(0,10)}&limit=200`,{headers:{Accept:'application/json',Authorization:`Bearer ${s.access_token}`,apikey:KEY},cache:'no-store'});const b=await r.json().catch(()=>({}));return r.ok?(b.appointments||[]):[];}
  function install(){const list=$('scheduleList');if(!list||list.dataset.visitActions)return;list.dataset.visitActions='1';const run=async()=>{const appointments=await load();[...list.querySelectorAll('.row')].forEach(row=>{if(row.querySelector('[data-start-visit]'))return;const code=row.textContent.match(/AZD-[A-Z0-9-]+/)?.[0]||'';const appt=appointments.find(x=>String(x.booking_code||'')===code);if(!appt)return;const b=document.createElement('button');b.type='button';b.dataset.startVisit=appt.id;b.className='tab';b.style.cssText='margin-inline-start:10px;font-weight:800';b.textContent=['checked_in','checked_in_late'].includes(String(appt.status||'').toLowerCase())?`🩺 ${tr('بدء الزيارة','Start Visit')}`:`🚦 ${esc(appt.status||'—')}`;b.onclick=async()=>{if(!['checked_in','checked_in_late'].includes(String(appt.status||'').toLowerCase()))return;try{const result=await startVisit(appt.id);b.textContent=`🟢 ${tr('الزيارة بدأت','Visit Started')}`;b.disabled=true;window.open(`clinical-assessment.html?booking_id=${encodeURIComponent(appt.id)}&patient_id=${encodeURIComponent(appt.patient_id||'')}&visit_id=${encodeURIComponent(result.visit?.id||'')}`,'_self');}catch(e){alert(e.message)}};row.appendChild(b);});};new MutationObserver(run).observe(list,{childList:true,subtree:true});setTimeout(run,700);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else setTimeout(install,500);
})();
