/* AZAAD CLINIC — Patient 360 Check-in Bridge v2 */
(() => {
  'use strict';
  const SUPABASE_URL='https://derofsthjivlkcdnojww.supabase.co';
  const KEY='sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const STATUS=new Set(['pending','confirmed']);
  const norm=v=>String(v||'').toLowerCase().trim().replaceAll('-','_').replaceAll(' ','_');
  const tr=(ar,en)=>(document.documentElement.lang||'ar').toLowerCase().startsWith('en')?en:ar;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const token=()=>window.AZAAD?.state?.session?.access_token||sessionStorage.getItem('azaad_admin_token')||'';
  const bookings=()=>Array.isArray(window.AZAAD_PATIENTS?.state?.bookings)?window.AZAAD_PATIENTS.state.bookings:[];
  async function rpc(fn,args){
    const t=token();
    if(!t)throw new Error(tr('جلسة الإدارة غير موجودة أو منتهية. أعد تحميل الصفحة ثم حاول مرة أخرى.','The admin session is missing or expired. Reload and try again.'));
    const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:'POST',cache:'no-store',headers:{Authorization:`Bearer ${t}`,apikey:KEY,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(args)});
    const b=await r.json().catch(()=>null);
    if(!r.ok)throw new Error(b?.message||b?.hint||b?.details||b?.error||`HTTP ${r.status}`);
    return b;
  }
  function bookingCodeInRoot(){return (document.getElementById('p360Content')?.textContent||'').match(/AZD-[A-Z0-9-]+/i)?.[0]||'';}
  function currentPatientBookings(){
    const code=bookingCodeInRoot();
    if(!code)return [];
    const booking=bookings().find(b=>String(b.booking_code||'').toUpperCase()===code.toUpperCase());
    if(!booking)return [];
    const pid=booking.patient_id||booking.clinic_patients?.id;
    return bookings().filter(b=>String(b.patient_id||b.clinic_patients?.id||'')===String(pid||''));
  }
  function bookingFromContainer(el){const code=(el.textContent||'').match(/AZD-[A-Z0-9-]+/i)?.[0]||'';return code?bookings().find(b=>String(b.booking_code||'').toUpperCase()===code.toUpperCase())||null:null;}
  function style(){
    if(document.getElementById('azaadP360CheckinBridgeStyle'))return;
    const s=document.createElement('style');s.id='azaadP360CheckinBridgeStyle';s.textContent=`
      .azaad-p360-checkin-btn{display:inline-flex!important;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:9px 14px;border:0;border-radius:10px;background:#167345;color:#fff;font-weight:800;cursor:pointer;margin:6px 4px 6px 0;visibility:visible!important;opacity:1!important}
      .azaad-p360-checkin-btn:disabled{opacity:.55!important;cursor:not-allowed}
      .azaad-p360-checkin-modal{position:fixed;inset:0;z-index:10050;background:rgba(15,25,70,.55);display:flex;align-items:center;justify-content:center;padding:15px}
      .azaad-p360-checkin-box{width:min(560px,100%);background:#fff;border-radius:16px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.22);direction:rtl}
      .azaad-p360-checkin-box textarea{width:100%;min-height:90px;margin:10px 0;padding:10px;border:1px solid #d9deea;border-radius:10px}
      .azaad-p360-checkin-actions{display:flex;gap:8px;flex-wrap:wrap}
    `;document.head.appendChild(s);
  }
  async function runCheckin(booking,notes){return rpc('clinic_frontdesk_checkin',{p_booking_id:booking.id,p_notes:notes||null});}
  function openDialog(booking,trigger){
    document.querySelector('.azaad-p360-checkin-modal')?.remove();
    const modal=document.createElement('div');modal.className='azaad-p360-checkin-modal';
    modal.innerHTML=`<div class="azaad-p360-checkin-box" role="dialog" aria-modal="true"><h3>🚪 ${tr('تسجيل دخول المريض','Patient Check-in')}</h3><p><strong>${esc(booking.patient_name||booking.clinic_patients?.full_name||booking.patient_id||'')}</strong></p><p class="muted">📅 ${esc(booking.appointment_date||'')} ⏰ ${esc(String(booking.appointment_time||'').slice(0,5))}</p><textarea placeholder="${tr('ملاحظة الاستقبال (اختياري)','Front desk note (optional)')}"></textarea><div class="azaad-p360-checkin-actions"><button type="button" class="btn btn-success" data-confirm>🟢 ${tr('تسجيل الدخول','Check in')}</button><button type="button" class="btn btn-secondary" data-close>${tr('إلغاء','Cancel')}</button></div><div data-result></div></div>`;
    document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('[data-close]').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});
    modal.querySelector('[data-confirm]').onclick=async()=>{const btn=modal.querySelector('[data-confirm]'),result=modal.querySelector('[data-result]');btn.disabled=true;try{const payload=await runCheckin(booking,modal.querySelector('textarea').value);result.innerHTML=`<div class="notice">🟢 ${tr('تم تسجيل حضور المريض بنجاح.','Patient checked in successfully.')}<br>${payload?.late_arrival?'⏰ '+tr('حضور متأخر.','Late arrival.'):''}<br>🧾 ${tr('الفاتورة','Invoice')}: <strong>${esc(payload?.invoice_number||payload?.invoice_id||'')}</strong></div>`;trigger.disabled=true;trigger.textContent=`✅ ${tr('تم Check-in','Checked in')}`;const b=bookings().find(x=>String(x.id)===String(booking.id));if(b)b.status=payload?.status||(payload?.late_arrival?'checked_in_late':'checked_in');setTimeout(()=>{close();window.AZAAD?.refresh?.();window.AZAAD_PATIENTS?.refresh?.();window.AZAADPatient360?.refresh?.();},700);}catch(error){result.innerHTML=`<div class="error">❌ ${esc(error?.message||tr('تعذر تسجيل الدخول.','Check-in failed.'))}</div>`;btn.disabled=false;}};
  }
  function inject(){
    const root=document.getElementById('p360Content');if(!root)return;style();
    const list=currentPatientBookings().filter(b=>STATUS.has(norm(b.status)));if(!list.length)return;
    root.querySelectorAll('tr,.p360-row,.item,.card').forEach(container=>{const booking=bookingFromContainer(container);if(!booking||!STATUS.has(norm(booking.status)))return;if(container.querySelector('.azaad-p360-checkin-btn'))return;const button=document.createElement('button');button.type='button';button.className='azaad-p360-checkin-btn';button.dataset.bookingId=booking.id;button.textContent=`🟢 ${tr('Check-in','Check in')}`;button.title=tr('تسجيل حضور المريض','Register patient arrival');button.onclick=()=>openDialog(booking,button);container.appendChild(button);});
    if(!root.querySelector('.azaad-p360-checkin-fallback')){const booking=list[0];const host=document.createElement('div');host.className='azaad-p360-checkin-fallback';const btn=document.createElement('button');btn.type='button';btn.className='azaad-p360-checkin-btn';btn.textContent=`🟢 ${tr('Check-in للمريض','Patient Check-in')}`;btn.onclick=()=>openDialog(booking,btn);host.appendChild(btn);root.prepend(host);}
  }
  function boot(){style();inject();const root=document.getElementById('p360Content');if(root&&!root.__azaadCheckinObserver){const observer=new MutationObserver(()=>inject());observer.observe(root,{childList:true,subtree:true});root.__azaadCheckinObserver=observer;}[250,1000,2000,4000].forEach(ms=>setTimeout(inject,ms));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.AZAADPatient360Checkin={inject,openDialog};
})();
