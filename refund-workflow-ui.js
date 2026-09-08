/* AZAAD CLINIC — SECURE REFUND WORKFLOW UI v2
 * Every refund: Request -> Doctor Approval -> Management/Owner Approval -> Processing.
 * Financial mutations use database-enforced RPCs; the UI never writes refund status directly.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const getClient = () => window.AZAAD?.supabase || window.supabaseClient || window.supabase;
  const tr = (ar, en) => (document.documentElement.lang || '').startsWith('en') ? en : ar;
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const role = () => String(window.AZAAD?.state?.staff?.role || window.AZAAD?.state?.identity?.role || '').toUpperCase();
  const frontRoles = ['SECRETARY','RECEPTIONIST','RECEPTION','CASHIER','FRONT_DESK','ADMIN','ADMINISTRATOR'];
  const toast = (m, error = false) => window.showToast ? window.showToast(m, error ? 'error' : 'success') : alert(m);

  async function client() {
    const c = getClient();
    if (c) return c;
    const mod = await import('https://esm.sh/@supabase/supabase-js@2');
    return mod.createClient(SUPABASE_URL, SUPABASE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  }

  async function staffContext(c) {
    const { data: { user }, error: authError } = await c.auth.getUser();
    if (authError || !user) throw new Error(tr('جلسة الموظف غير صالحة.','Invalid staff session.'));
    const { data, error } = await c.from('clinic_staff').select('id,auth_user_id,full_name,full_name_en,role,active,is_active').eq('auth_user_id', user.id).limit(1).maybeSingle();
    if (error) throw error;
    if (!data || !(data.active === true || data.is_active === true)) throw new Error(tr('حساب الموظف غير نشط.','Staff account is not active.'));
    return data;
  }

  async function getRefunds(c, filter) {
    let q = c.from('clinic_refund_requests').select('id,invoice_id,payment_id,booking_id,patient_id,doctor_id,requested_by,requested_at,amount,reason_code,reason,status,approved_by,approved_at,approval_note,processed_by,processed_at,refund_method,refund_reference,admin_approval_required,admin_approval_status,admin_approved_by,admin_approved_at,admin_approval_note,management_approval_required,management_approval_status,management_approved_by,management_approved_at,management_approval_note,doctor_approval_required,doctor_approval_status,doctor_approved_by,doctor_approved_at,doctor_approval_note').order('created_at',{ascending:false}).limit(100);
    if (filter === 'doctor') q = q.eq('status','pending').eq('doctor_approval_status','pending');
    if (filter === 'management') q = q.eq('status','pending').eq('doctor_approval_status','approved').eq('management_approval_status','pending');
    if (filter === 'processing') q = q.eq('status','approved').eq('doctor_approval_status','approved').eq('management_approval_status','approved');
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function invoiceInfo(c, invoiceId) {
    const { data, error } = await c.from('clinic_invoices').select('id,invoice_number,patient_id,total,refunded_amount').eq('id',invoiceId).maybeSingle();
    if (error) throw error;
    return data || {};
  }

  async function requestRefund(bookingId) {
    try {
      const c = await client();
      const staff = await staffContext(c);
      const { data: invoice, error: invError } = await c.from('clinic_invoices').select('id,invoice_number,patient_id,booking_id,total,refunded_amount').eq('booking_id',bookingId).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if (invError) throw invError;
      if (!invoice) throw new Error(tr('لا توجد فاتورة مرتبطة بهذا الحجز.','No invoice is linked to this booking.'));
      const { data: payments, error: payError } = await c.from('clinic_payments').select('id,amount,method,verification_status,paid_at').eq('invoice_id',invoice.id).eq('verification_status','verified');
      if (payError) throw payError;
      const paid = (payments || []).reduce((n,p)=>n+Number(p.amount||0),0);
      const refundable = Math.max(0, paid - Number(invoice.refunded_amount||0));
      if (refundable <= 0) throw new Error(tr('لا يوجد مبلغ قابل للاسترداد.','No refundable balance is available.'));
      const amount = Number(prompt(tr(`المتاح للاسترداد: ${refundable.toFixed(2)}\nأدخل مبلغ الاسترداد:`,`Refundable: ${refundable.toFixed(2)}\nEnter refund amount:`),refundable.toFixed(2)));
      if (!Number.isFinite(amount) || amount <= 0 || amount > refundable + 0.00001) return;
      const reason = prompt(tr('سبب طلب الاسترداد (مطلوب):','Refund reason (required):'));
      if (!reason?.trim()) return;
      const code = (prompt(tr('نوع السبب: patient_request / medical_reason / duplicate_payment / cancellation / other','Reason code: patient_request / medical_reason / duplicate_payment / cancellation / other'),'other') || 'other').trim();
      const paymentId = payments?.[0]?.id || null;
      const { error } = await c.from('clinic_refund_requests').insert({invoice_id:invoice.id,payment_id:paymentId,booking_id:invoice.booking_id,patient_id:invoice.patient_id,doctor_id:null,requested_by:staff.id,amount,reason_code:code || 'other',reason:reason.trim(),metadata:{source:'refund-workflow-ui',original_payment_methods:(payments||[]).map(p=>p.method)}});
      if (error) throw error;
      toast(tr('✅ تم إنشاء طلب Refund. أصبح الآن بانتظار موافقة الطبيب ثم الإدارة/Owner.','✅ Refund request created. It now requires Doctor approval, then Management/Owner approval.'));
      await loadPanels();
    } catch (e) { toast(e.message || String(e), true); }
  }

  async function doctorAction(id, approve) {
    try {
      const c = await client();
      const note = prompt(tr(approve?'ملاحظات الموافقة (اختياري):':'سبب الرفض (مطلوب):',approve?'Approval note (optional):':'Rejection reason (required):')) || '';
      if (!approve && !note.trim()) return;
      if (approve) {
        const { error } = await c.rpc('approve_refund_doctor',{p_refund_id:id,p_note:note});
        if (error) throw error;
      } else {
        const { error } = await c.from('clinic_refund_requests').update({status:'rejected',doctor_approval_status:'rejected',doctor_rejection_note:note.trim(),doctor_rejected_at:new Date().toISOString()}).eq('id',id).eq('status','pending').eq('doctor_approval_status','pending');
        if (error) throw error;
      }
      toast(tr('تم تحديث طلب الاسترداد.','Refund request updated.'));
      await loadPanels();
    } catch (e) { toast(e.message || String(e), true); }
  }

  async function managementAction(id, approve) {
    try {
      const c = await client();
      const note = prompt(tr(approve?'ملاحظات موافقة الإدارة (اختياري):':'سبب رفض الإدارة (مطلوب):',approve?'Management approval note (optional):':'Management rejection reason (required):')) || '';
      if (!approve && !note.trim()) return;
      if (approve) {
        const { error } = await c.rpc('approve_refund_management',{p_refund_id:id,p_note:note});
        if (error) throw error;
      } else {
        const { error } = await c.from('clinic_refund_requests').update({status:'rejected',management_approval_status:'rejected',management_rejection_note:note.trim(),management_rejected_at:new Date().toISOString()}).eq('id',id).eq('status','pending').eq('doctor_approval_status','approved').eq('management_approval_status','pending');
        if (error) throw error;
      }
      toast(tr('تم تحديث موافقة الإدارة.','Management approval updated.'));
      await loadPanels();
    } catch (e) { toast(e.message || String(e), true); }
  }

  async function processRefund(id) {
    try {
      const c = await client();
      const method = (prompt(tr('طريقة الاسترداد: cash / bank / card / wallet / gateway','Refund method: cash / bank / card / wallet / gateway'),'cash') || '').trim().toLowerCase();
      if (!method) return;
      const ref = ['bank','card','wallet','gateway'].includes(method) ? (prompt(tr('رقم مرجع الاسترداد مطلوب:','Refund reference is required:')) || '').trim() : '';
      if (['bank','card','wallet','gateway'].includes(method) && !ref) return;
      const { error } = await c.rpc('process_refund',{p_refund_id:id,p_refund_method:method,p_refund_reference:ref});
      if (error) throw error;
      toast(tr('✅ تم تنفيذ الاسترداد بعد اكتمال الموافقات.','✅ Refund processed after all required approvals.'));
      await loadPanels();
    } catch (e) { toast(e.message || String(e), true); }
  }

  function styles() {
    if (document.getElementById('refundUiStyles')) return;
    const s=document.createElement('style'); s.id='refundUiStyles'; s.textContent='.refund-box{margin-top:12px;padding:14px;border:1px solid #e4e7ee;border-radius:12px;background:#fafbfe}.refund-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.refund-grid .full{grid-column:1/-1}.refund-flow{font-weight:700;margin-top:7px}.refund-step{display:inline-block;padding:4px 8px;border-radius:999px;margin:2px;font-size:11px}.refund-pending{background:#fff4cc;color:#755c00}.refund-approved{background:#e7f7ed;color:#167345}.refund-locked{background:#ffecef;color:#a32939}@media(max-width:700px){.refund-grid{grid-template-columns:1fr}}'; document.head.appendChild(s);
  }

  function panel(id, title, subtitle) {
    let el=document.getElementById(id);
    if(!el){el=document.createElement('div');el.id=id;el.className='card';const target=document.querySelector('#adminPage .panel.active')||document.querySelector('.admin')||document.body;target.prepend(el);}
    el.innerHTML=`<div class="panel-head"><div><h3>${title}</h3><div class="muted">${subtitle}</div></div><button class="btn btn-secondary" data-refund-refresh>🔄 ${tr('تحديث','Refresh')}</button></div><div class="items" style="margin-top:12px" data-refund-items><div class="empty">${tr('جاري التحميل...','Loading...')}</div></div>`;
    el.querySelector('[data-refund-refresh]').onclick=loadPanels;
    return el;
  }

  async function renderRows(el, rows, mode) {
    const items=el.querySelector('[data-refund-items]');
    if(!rows.length){items.innerHTML=`<div class="empty">📭 ${tr('لا توجد طلبات.','No refund requests.')}</div>`;return;}
    const c=await client();
    const invoices=new Map();
    for(const r of rows){if(!invoices.has(r.invoice_id)) invoices.set(r.invoice_id,await invoiceInfo(c,r.invoice_id));}
    items.innerHTML=rows.map(r=>{
      const inv=invoices.get(r.invoice_id)||{};
      const doctor=r.doctor_approval_status==='approved';
      const mgmt=r.management_approval_status==='approved';
      let actions='';
      if(mode==='doctor' && r.status==='pending' && r.doctor_approval_status==='pending') actions=`<button class="btn btn-success" data-a="doctor" data-id="${esc(r.id)}">✅ ${tr('موافقة الطبيب','Doctor Approve')}</button><button class="btn btn-danger" data-r="doctor" data-id="${esc(r.id)}">❌ ${tr('رفض','Reject')}</button>`;
      if(mode==='management' && r.status==='pending' && doctor && !mgmt) actions=`<button class="btn btn-success" data-a="management" data-id="${esc(r.id)}">👑 ${tr('موافقة الإدارة/Owner','Management/Owner Approve')}</button><button class="btn btn-danger" data-r="management" data-id="${esc(r.id)}">❌ ${tr('رفض','Reject')}</button>`;
      if(mode==='processing' && r.status==='approved' && doctor && mgmt) actions=`<button class="btn btn-gold" data-process="${esc(r.id)}">💵 ${tr('تنفيذ Refund','Process Refund')}</button>`;
      return `<div class="item"><div><b>💸 ${esc(inv.invoice_number||r.invoice_id)} · ${Number(r.amount||0).toFixed(2)}</b><div>${tr('الطلب بواسطة','Requested by')}: ${esc(r.requested_by||'—')} · ${esc(r.requested_at||'')}</div><div>${tr('السبب','Reason')}: ${esc(r.reason)}</div><div class="refund-flow"><span class="refund-step ${doctor?'refund-approved':'refund-pending'}">${doctor?'✅':'⏳'} Doctor</span><span class="refund-step ${mgmt?'refund-approved':'refund-pending'}">${mgmt?'✅':'⏳'} Management/Owner</span><span class="refund-step refund-locked">🔒 Processing</span></div></div><div class="item-actions">${actions||`<span class="badge ${r.status==='rejected'?'cancelled':r.status==='processed'?'completed':r.status==='approved'?'confirmed':'pending'}">${esc(r.status)}</span>`}</div></div>`;
    }).join('');
    items.querySelectorAll('[data-a="doctor"]').forEach(b=>b.onclick=()=>doctorAction(b.dataset.id,true));
    items.querySelectorAll('[data-r="doctor"]').forEach(b=>b.onclick=()=>doctorAction(b.dataset.id,false));
    items.querySelectorAll('[data-a="management"]').forEach(b=>b.onclick=()=>managementAction(b.dataset.id,true));
    items.querySelectorAll('[data-r="management"]').forEach(b=>b.onclick=()=>managementAction(b.dataset.id,false));
    items.querySelectorAll('[data-process]').forEach(b=>b.onclick=()=>processRefund(b.dataset.process));
  }

  async function frontPanel(){
    const el=panel('refundRequestsPanel','💸 '+tr('طلبات الاسترداد','Refund Requests'),tr('كل Refund يحتاج موافقة الطبيب ثم الإدارة/Owner قبل التنفيذ.','Every refund requires Doctor then Management/Owner approval before processing.'));
    await renderRows(el,await getRefunds(await client(),'processing').catch(()=>[]),'processing');
    const pending=await getRefunds(await client()).catch(()=>[]);
    await renderRows(el,pending,'front');
  }

  async function doctorPanel(){
    const el=panel('doctorRefundApprovals','🧑‍⚕️💸 '+tr('موافقات الطبيب','Doctor Refund Approvals'),tr('هذه المرحلة إلزامية لكل Refund.','This approval is mandatory for every refund.'));
    await renderRows(el,await getRefunds(await client(),'doctor'),'doctor');
  }

  async function managementPanel(){
    const el=panel('managementRefundApprovals','👑💸 '+tr('موافقات الإدارة / Owner','Management / Owner Refund Approvals'),tr('لا تظهر للموافقة إلا بعد اعتماد الطبيب.','Requests appear only after Doctor approval.'));
    await renderRows(el,await getRefunds(await client(),'management'),'management');
  }

  function addButtons(){
    if(!frontRoles.includes(role())) return;
    const rows=document.querySelectorAll('#appointmentList .appointment-row');
    const bookings=window.AZAAD_PATIENTS?.state?.bookings||[];
    rows.forEach(row=>{
      if(row.querySelector('[data-refund-ui]'))return;
      const text=row.textContent||''; const b=bookings.find(x=>x.booking_code&&text.includes(x.booking_code)); if(!b)return;
      const btn=document.createElement('button'); btn.className='btn btn-secondary'; btn.type='button'; btn.dataset.refundUi='1'; btn.textContent='💸 '+tr('طلب Refund','Request Refund'); btn.onclick=()=>requestRefund(b.id); row.appendChild(btn);
    });
  }

  async function loadPanels(){
    try{
      styles();
      const c=await client();
      await staffContext(c);
      const r=role();
      if(frontRoles.includes(r)) await frontPanel();
      if(r==='DOCTOR') await doctorPanel();
      if(['ADMIN','ADMINISTRATOR','OWNER'].includes(r)) await managementPanel();
      addButtons();
    }catch(e){ if(role()) toast(e.message||String(e),true); }
  }

  function boot(){
    styles();
    loadPanels();
    const obs=new MutationObserver(()=>addButtons());
    obs.observe(document.body,{subtree:true,childList:true});
    const c=getClient();
    if(c?.auth?.onAuthStateChange) c.auth.onAuthStateChange(()=>setTimeout(loadPanels,250));
    window.AZAAD_REFUNDS={requestRefund,loadPanels,doctorAction,managementAction,processRefund};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();