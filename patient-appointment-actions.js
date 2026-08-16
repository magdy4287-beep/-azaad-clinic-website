/* AZAAD CLINIC — Patient 360 Appointment Actions V6 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const SUPABASE_URL='https://derofsthjivlkcdnojww.supabase.co';
  const CHECKIN_API=`${SUPABASE_URL}/functions/v1/azaad-frontdesk-checkin`;
  const KEY='sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const tr=(ar,en)=>(document.documentElement.lang||'ar').toLowerCase().startsWith('en')?en:ar;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const token=()=>window.AZAAD?.state?.session?.access_token||sessionStorage.getItem('azaad_admin_token')||'';
  const toast=(m,error=false)=>window.showToast?window.showToast(m,error?'error':'success'):alert(m);
  async function request(url,options={}){const t=token();if(!t)throw Error(tr('جلسة الإدارة غير موجودة أو منتهية.','The admin session is missing or expired.'));const r=await fetch(url,{...options,cache:'no-store',headers:{Authorization:`Bearer ${t}`,apikey:KEY,Accept:'application/json','Content-Type':'application/json',...(options.headers||{})}});const b=await r.json().catch(()=>null);if(!r.ok)throw Error(b?.message||b?.hint||b?.details||b?.error||`HTTP ${r.status}`);return b;}
  async function rpc(fn,args){return request(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:'POST',body:JSON.stringify(args)});}
  async function checkIn(booking){return request(CHECKIN_API,{method:'POST',body:JSON.stringify({booking_id:booking.id})});}
  async function findInvoice(booking){
    if(booking?.invoice_id)return {id:booking.invoice_id,number:booking.invoice_number,total:booking.invoice_total||booking.total||300,status:booking.invoice_status||booking.payment_status||'unpaid'};
    const q=new URLSearchParams({select:'id,invoice_number,total,status,booking_id',booking_id:`eq.${booking.id}`,order:'created_at.desc',limit:'1'});
    const rows=await request(`${SUPABASE_URL}/rest/v1/clinic_invoices?${q.toString()}`,{method:'GET',headers:{'Content-Type':undefined}});
    const inv=Array.isArray(rows)?rows[0]:null;
    return inv||null;
  }
  function addStyle(){if($('patientAppointmentActionsStyle'))return;const s=document.createElement('style');s.id='patientAppointmentActionsStyle';s.textContent='.p360-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;padding:12px;background:#f7f8fb;border:1px solid #e4e7ee;border-radius:12px}.p360-action-title{width:100%;font-weight:900;color:#17214f}.p360-action-status{font-size:12px;color:#5f6880;width:100%}.p360-actions button{min-height:42px}.p360-pay-box{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;width:100%;margin-top:8px}.p360-pay-box input,.p360-pay-box select{padding:9px;border:1px solid #d9deea;border-radius:9px}.p360-pay-box .pay-note{grid-column:1/-1;font-size:12px;color:#5f6880}@media(max-width:700px){.p360-pay-box{grid-template-columns:1fr}}';document.head.appendChild(s);}
  function appointmentFromRow(row){const code=row.textContent.match(/AZD-[A-Z0-9-]+/)?.[0]||'';const rows=Array.isArray(window.AZAAD_PATIENTS?.state?.bookings)?window.AZAAD_PATIENTS.state.bookings:[];return rows.find(x=>String(x.booking_code||'')===code)||null;}
  function doctorUrl(booking){const params=new URLSearchParams();if(booking?.id)params.set('booking_id',booking.id);if(booking?.patient_id)params.set('patient_id',booking.patient_id);return `doctor-dashboard.html?${params.toString()}`;}
  function paymentBox(invoice,bar,booking){
    const box=document.createElement('div');box.className='p360-pay-box';box.innerHTML=`<input type="number" min="0.01" step="0.01" value="${Number(invoice.total||300).toFixed(2)}" placeholder="${tr('المبلغ','Amount')}" data-pay-amount><select data-pay-method><option value="cash">💵 ${tr('نقدي','Cash')}</option><option value="card">💳 ${tr('بطاقة','Card')}</option><option value="vodafone_cash">📱 Vodafone Cash</option><option value="wallet">📱 ${tr('محفظة','Wallet')}</option><option value="bank_transfer">🏦 ${tr('تحويل بنكي','Bank transfer')}</option><option value="other">🔹 ${tr('أخرى','Other')}</option></select><button type="button" class="btn btn-gold" data-pay-btn>💳 ${tr('تسجيل الدفع','Record Payment')}</button><div class="pay-note">${tr('اختر طريقة الدفع ثم اضغط تسجيل الدفع. فتح الفاتورة لا يسجل أي مبلغ.','Choose the payment method, then press Record Payment. Opening the invoice never records a payment.')}</div>`;bar.appendChild(box);
    const button=box.querySelector('[data-pay-btn]');
    button.onclick=async()=>{const amount=Number(box.querySelector('[data-pay-amount]').value);const method=box.querySelector('[data-pay-method]').value;if(!(amount>0)){toast(tr('أدخل مبلغ الدفع.','Enter a valid payment amount.'),true);return;}if(String(invoice.status||'').toLowerCase()==='paid'){toast(tr('الفاتورة مدفوعة بالفعل.','This invoice is already paid.'),true);return;}button.disabled=true;try{const p=await rpc('clinic_record_payment',{p_invoice_id:invoice.id,p_amount:amount,p_method:method,p_reference:null,p_notes:tr('دفع من Patient 360','Payment from Patient 360')});const verified=String(p?.verification_status||'').toLowerCase()==='verified';invoice.status=verified?'paid':(p?.invoice_status||p?.status||'pending');bar.querySelector('[data-action-state]').textContent=`${verified?'🟢':'🟡'} ${esc(booking?.status||'checked_in')} · 🧾 ${esc(invoice.invoice_number||'Invoice')} · 💳 ${esc(invoice.status||'pending')}`;toast(method==='bank_transfer'?tr('🟡 تم تسجيل التحويل البنكي ويحتاج Verification.','🟡 Bank transfer recorded and requires verification.'):tr('🟢 تم تسجيل الدفع وتحديث حالة الفاتورة.','🟢 Payment recorded and invoice status updated.'));window.AZAAD_PATIENTS?.load?.();}catch(e){toast(e.message,true);}finally{button.disabled=false;}};
    return box;
  }
  function renderActions(){
    const content=$('p360Content');if(!content)return;
    [...content.querySelectorAll('.p360-row')].filter(r=>/🔖/.test(r.textContent||'')&&/⏰/.test(r.textContent||'')).forEach(async row=>{
      if(row.dataset.actionBound==='1')return;row.dataset.actionBound='1';
      const booking=appointmentFromRow(row);if(!booking){row.dataset.actionBound='';return;}
      const bar=document.createElement('div');bar.className='p360-actions';
      bar.innerHTML=`<div class="p360-action-title">🏥 ${tr('إجراءات الموعد','Appointment Actions')}</div><div class="p360-action-status" data-action-state>🚦 ${esc(booking.status||'—')} · 💳 ${esc(booking.payment_status||'unpaid')}</div>`;row.appendChild(bar);
      const add=(label,cls,handler)=>{const b=document.createElement('button');b.type='button';b.className=`btn ${cls}`;b.textContent=label;b.onclick=handler;bar.appendChild(b);return b;};
      const status=String(booking.status||'').toLowerCase().replaceAll('-','_');
      if(['pending','confirmed'].includes(status))add(`🟢 ${tr('دخول / Check-in','Check-in')}`,'btn-success',async()=>{try{const result=await checkIn(booking);const d=result?.data||result;if(d?.invoice_id)booking.invoice_id=d.invoice_id;if(d?.invoice_number)booking.invoice_number=d.invoice_number;if(d?.invoice_status)booking.payment_status=d.invoice_status;booking.status=d?.status||'checked_in';bar.querySelector('[data-action-state]').textContent=`🟢 ${esc(booking.status)} · 🧾 ${esc(d?.invoice_number||'Invoice')} · 💳 ${esc(d?.invoice_status||'unpaid')}`;toast(d?.late_arrival?tr('🟡 تم الدخول متأخرًا وإنشاء/تأكيد الفاتورة.','🟡 Checked in late; invoice created/confirmed.'):tr('🟢 تم دخول المريض وإنشاء/تأكيد الفاتورة.','🟢 Patient checked in; invoice created/confirmed.'));window.AZAAD_PATIENTS?.load?.();}catch(e){toast(e.message,true);}});
      try{const inv=await findInvoice(booking);if(inv){booking.invoice_id=inv.id;booking.invoice_number=inv.invoice_number;booking.invoice_total=inv.total;booking.invoice_status=inv.status;bar.querySelector('[data-action-state]').textContent=`${String(inv.status).toLowerCase()==='paid'?'🟢':'🟠'} ${esc(booking.status||'checked_in')} · 🧾 ${esc(inv.invoice_number||'Invoice')} · 💳 ${esc(inv.status||'unpaid')}`;paymentBox(inv,bar,booking);}}catch(e){console.warn('Patient 360 invoice lookup:',e);}
      add(`🧾 ${tr('الفاتورة','Invoice')}`,'btn-primary',()=>{[...content.parentElement.querySelectorAll('.p360-tab')].find(b=>b.dataset.view==='invoices')?.click();});
      add(`🩺 ${tr('تحويل للطبيب','Send to Doctor')}`,'btn-gold',()=>{const ready=['checked_in','checked_in_late','in_progress'].includes(String(booking.status||'').toLowerCase());if(!ready){toast(tr('🟡 يجب تنفيذ Check-in أولًا قبل تحويل المريض للطبيب.','🟡 Check-in must be completed before sending the patient to the Doctor Queue.'),true);return;}findInvoice(booking).then(inv=>{if(!inv||String(inv.status).toLowerCase()!=='paid'){toast(tr('💳 يجب تسوية الفاتورة قبل دخول المريض للطبيب.','💳 The invoice must be paid before Doctor access.'),true);return;}window.location.href=doctorUrl(booking);}).catch(e=>toast(e.message,true));});
    });
  }
  async function renderInvoiceActions(){
    const content=$('p360Content');if(!content)return;
    [...content.querySelectorAll('.p360-row')].filter(r=>/🧾/.test(r.textContent||'')&&/INV-/.test(r.textContent||'')).forEach(async row=>{
      if(row.dataset.invoiceActionBound==='1')return;row.dataset.invoiceActionBound='1';
      const match=row.textContent.match(/INV-[0-9-]+/);if(!match){row.dataset.invoiceActionBound='';return;}
      const invoiceNumber=match[0];
      try{
        const q=new URLSearchParams({select:'id,invoice_number,total,status,booking_id',invoice_number:`eq.${invoiceNumber}`,order:'created_at.desc',limit:'1'});
        const rows=await request(`${SUPABASE_URL}/rest/v1/clinic_invoices?${q.toString()}`,{method:'GET',headers:{'Content-Type':undefined}});
        const invoice=Array.isArray(rows)?rows[0]:null;if(!invoice)return;
        const bookings=Array.isArray(window.AZAAD_PATIENTS?.state?.bookings)?window.AZAAD_PATIENTS.state.bookings:[];
        const booking=bookings.find(x=>String(x.id)===String(invoice.booking_id));
        const bar=document.createElement('div');bar.className='p360-actions';bar.innerHTML=`<div class="p360-action-title">💳 ${tr('الدفع','Payment')}</div><div class="p360-action-status" data-action-state>${String(invoice.status).toLowerCase()==='paid'?'🟢':'🟠'} ${esc(invoice.invoice_number)} · ${Number(invoice.total||0).toFixed(2)} · ${esc(invoice.status||'unpaid')}</div>`;row.appendChild(bar);
        if(String(invoice.status).toLowerCase()!=='paid')paymentBox(invoice,bar,booking);
      }catch(e){console.warn('Patient 360 invoice action:',e);row.dataset.invoiceActionBound='';}
    });
  }
  function install(){addStyle();new MutationObserver(()=>{renderActions();renderInvoiceActions();}).observe(document.body,{childList:true,subtree:true});renderActions();renderInvoiceActions();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,500),{once:true});else setTimeout(install,500);
})();
