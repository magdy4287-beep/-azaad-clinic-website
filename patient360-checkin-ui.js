/* AZAAD CLINIC — Patient 360 Check-in UI */
(() => {
  'use strict';
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const CHECKIN_API = `${SUPABASE_URL}/functions/v1/azaad-frontdesk-checkin`;
  const APPOINTMENTS_API = `${SUPABASE_URL}/functions/v1/azaad-appointments-center`;
  const allowedRoles = new Set(['OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION']);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  function token(){ const live=window.AZAAD?.state?.session?.access_token; if(live)return live; try{return sessionStorage.getItem('azaad_admin_token')||'';}catch(_){return '';} }
  function roleAllowed(){const role=String(window.AZAAD?.state?.role||window.AZAAD?.state?.currentRole||'').toUpperCase();return allowedRoles.has(role);}
  function findBookingCode(text){return (text.match(/🔖\s*([^\s<]+)/)||[])[1]||'';}
  async function resolveBookingId(bookingCode){
    const t=token(); if(!t) throw new Error('جلسة الإدارة غير موجودة أو منتهية.');
    const params=new URLSearchParams({q:bookingCode,limit:'10'});
    const r=await fetch(`${APPOINTMENTS_API}?${params}`,{headers:{Accept:'application/json',Authorization:`Bearer ${t}`,apikey:SUPABASE_KEY},cache:'no-store'});
    let b={};try{b=await r.json();}catch(_){ }
    if(!r.ok)throw new Error(b?.error||b?.message||`HTTP ${r.status}`);
    const rows=Array.isArray(b?.appointments)?b.appointments:[];
    const match=rows.find(x=>String(x.booking_code||'')===String(bookingCode));
    if(!match?.id)throw new Error('تعذر العثور على الحجز المطلوب.');
    return match;
  }
  function injectButtons(){
    const content=document.getElementById('p360Content'); if(!content||!roleAllowed())return;
    content.querySelectorAll('.p360-row').forEach(row=>{
      if(row.querySelector('[data-p360-checkin]'))return;
      const code=findBookingCode(row.textContent||''); if(!code)return;
      const action=document.createElement('div'); action.className='p360-checkin-action';
      action.innerHTML=`<button type="button" class="btn btn-success" data-p360-checkin="${esc(code)}">🟢 Check-in</button>`;
      row.appendChild(action); action.querySelector('button').onclick=()=>checkin(code,action.querySelector('button'));
    });
  }
  async function checkin(bookingCode,button){
    const t=token(); if(!t){alert('جلسة الإدارة غير موجودة أو منتهية.');return;}
    const original=button.innerHTML;button.disabled=true;button.innerHTML='⏳ جاري تسجيل الحضور...';
    try{
      const appointment=await resolveBookingId(bookingCode);
      const response=await fetch(CHECKIN_API,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${t}`,apikey:SUPABASE_KEY},body:JSON.stringify({booking_id:appointment.id})});
      let body={};try{body=await response.json();}catch(_){ }
      if(!response.ok)throw new Error(body?.error||body?.message||`HTTP ${response.status}`);
      button.className='btn btn-secondary';button.innerHTML='✅ Checked-in';button.disabled=true;
      const host=button.closest('.p360-row'); if(host&&!host.querySelector('.p360-checkin-success')){const note=document.createElement('div');note.className='p360-checkin-success muted';note.textContent='🛡️ تم تسجيل الحضور عبر Front Desk مع الصلاحيات والتدقيق.';host.appendChild(note);}
      window.dispatchEvent(new CustomEvent('azaad:patient360-checkin-complete',{detail:{bookingId:appointment.id,bookingCode,data:body?.data||null}}));
    }catch(error){button.disabled=false;button.innerHTML=original;alert(`تعذر تسجيل الحضور: ${error.message}`);}
  }
  function observe(){const modalContent=document.getElementById('modalContent');if(!modalContent||modalContent.__p360CheckinObserver)return;modalContent.__p360CheckinObserver=true;new MutationObserver(()=>setTimeout(injectButtons,0)).observe(modalContent,{childList:true,subtree:true});setTimeout(injectButtons,0);}
  function boot(){if(!/admin\.html$/i.test(location.pathname))return;observe();setInterval(injectButtons,1200);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
