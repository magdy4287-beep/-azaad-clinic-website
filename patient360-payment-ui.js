/* AZAAD CLINIC — Patient 360 Payment UI */
(() => {
  'use strict';
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const PAYMENT_API = `${SUPABASE_URL}/rest/v1/rpc/clinic_record_payment`;
  const INVOICE_API = `${SUPABASE_URL}/rest/v1/clinic_invoices`;
  const ALLOWED = new Set(['OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION','RECEPTIONIST','CASHIER']);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const token = () => window.AZAAD?.state?.session?.access_token || sessionStorage.getItem('azaad_admin_token') || '';
  const allowed = () => ALLOWED.has(String(window.AZAAD?.state?.role || window.AZAAD?.state?.currentRole || '').toUpperCase());
  function addStyle(){ if(document.getElementById('p360-payment-style')) return; const s=document.createElement('style'); s.id='p360-payment-style'; s.textContent='.p360-pay{margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.p360-pay button{cursor:pointer}.p360-pay select{padding:7px;border-radius:7px}.p360-paid{font-weight:600}.p360-pay-error{font-size:12px;margin-inline-start:8px}.p360-pay select,.p360-pay button{font:inherit}'; document.head.appendChild(s); }
  function parseInvoice(row){ const text=row.textContent||''; const m=text.match(/(INV-[A-Z0-9-]+)\s*[•·]\s*([0-9]+(?:\.[0-9]+)?)\s*[•·]\s*unpaid/i); if(!m) return null; return {number:m[1],amount:Number(m[2])}; }
  async function resolveInvoice(inv){
    const t=token();
    const url=`${INVOICE_API}?select=id,invoice_number,total,status&invoice_number=eq.${encodeURIComponent(inv.number)}&limit=1`;
    const r=await fetch(url,{headers:{Accept:'application/json',Authorization:`Bearer ${t}`,apikey:SUPABASE_KEY},cache:'no-store'});
    const rows=await r.json().catch(()=>[]); if(!r.ok) throw new Error(rows?.message||rows?.hint||`HTTP ${r.status}`);
    const x=Array.isArray(rows)?rows[0]:null; if(!x?.id) throw new Error('تعذر تحديد الفاتورة المطلوبة.');
    if(String(x.status).toLowerCase()!=='unpaid') throw new Error(`الفاتورة حالتها الحالية: ${x.status}`);
    return {...inv,id:x.id,amount:Number(x.total)};
  }
  function invoiceRows(){
    const content=document.getElementById('p360Content') || document.getElementById('modalContent') || document.body;
    const direct=[...content.querySelectorAll('.p360-row')];
    if(direct.length) return direct;
    const candidates=[...content.querySelectorAll('div,li,tr,article,section')];
    return candidates.filter(el=>/INV-[A-Z0-9-]+\s*[•·]\s*[0-9]+(?:\.[0-9]+)?\s*[•·]\s*unpaid/i.test(el.textContent||'') && ![...el.children].some(ch=>/INV-[A-Z0-9-]+\s*[•·]\s*[0-9]+(?:\.[0-9]+)?\s*[•·]\s*unpaid/i.test(ch.textContent||'')));
  }
  function inject(){
    if(!allowed()) return;
    invoiceRows().forEach(row=>{
      if(row.querySelector('[data-p360-payment]')) return;
      const inv=parseInvoice(row); if(!inv) return;
      const host=document.createElement('div'); host.className='p360-pay'; host.dataset.p360Payment='1';
      host.innerHTML=`<select aria-label="طريقة الدفع" data-method><option value="cash">💵 Cash</option><option value="card">💳 Card</option><option value="vodafone_cash">📱 Vodafone Cash</option><option value="wallet">📱 Wallet</option><option value="bank_transfer">🏦 Bank Transfer</option><option value="other">Other</option></select><button type="button" class="btn btn-primary" data-pay>💳 تسجيل الدفع ${esc(inv.amount.toFixed(2))} EGP</button>`;
      host.querySelector('[data-pay]').onclick=()=>pay(inv,host);
      row.appendChild(host);
    });
  }
  async function pay(inv,host){
    const t=token(); const btn=host.querySelector('[data-pay]'); const method=host.querySelector('[data-method]').value;
    if(!t){ host.insertAdjacentHTML('beforeend','<span class="p360-pay-error">جلسة الإدارة غير موجودة أو منتهية.</span>'); return; }
    btn.disabled=true; btn.textContent='⏳ جاري تسجيل الدفع...';
    try{
      const current=await resolveInvoice(inv);
      const r=await fetch(PAYMENT_API,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:`Bearer ${t}`,apikey:SUPABASE_KEY},body:JSON.stringify({p_invoice_id:current.id,p_amount:current.amount,p_method:method,p_reference:null,p_notes:'Patient 360 front-desk payment'})});
      const b=await r.json().catch(()=>({})); if(!r.ok) throw new Error(b?.message||b?.hint||b?.details||b?.error||`HTTP ${r.status}`);
      host.innerHTML='<span class="p360-paid">✅ Paid — '+esc(current.amount.toFixed(2))+' EGP</span>';
      window.dispatchEvent(new CustomEvent('azaad:patient360-payment-complete',{detail:{invoiceId:current.id,invoiceNumber:current.number,amount:current.amount,method,data:b}}));
    }catch(e){ btn.disabled=false; btn.textContent=`💳 تسجيل الدفع ${inv.amount.toFixed(2)} EGP`; host.querySelector('.p360-pay-error')?.remove(); host.insertAdjacentHTML('beforeend',`<span class="p360-pay-error">تعذر تسجيل الدفع: ${esc(e.message)}</span>`); }
  }
  function boot(){ if(!/admin\.html$/i.test(location.pathname)) return; addStyle(); const root=document.getElementById('modalContent')||document.getElementById('p360Content')||document.body; if(!root.__p360PaymentObserver){ root.__p360PaymentObserver=true; new MutationObserver(()=>setTimeout(inject,0)).observe(root,{childList:true,subtree:true}); } inject(); setInterval(inject,1000); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();