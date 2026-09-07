(() => {
  'use strict';

  const FINANCIAL_API = '/api/patient-financial-summary';

  const isEnglish = () => (document.documentElement.lang || localStorage.getItem('azaad_language') || '').toLowerCase().startsWith('en');
  const tr = (ar, en) => isEnglish() ? en : ar;
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[c]));
  const money = v => { const n = Number(v); return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'; };

  async function getFinancialSummary(patientId) {
    if (!patientId) throw new Error(tr('معرّف المريض غير موجود.','Patient identifier is missing.'));
    const u = new URL(FINANCIAL_API, window.location.origin);
    u.searchParams.set('patient_id', patientId);
    const response = await fetch(u, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
    return {
      invoices: Array.isArray(body?.invoices) ? body.invoices : [],
      payments: Array.isArray(body?.payments) ? body.payments : []
    };
  }

  function styles() {
    if (document.getElementById('patientFinancialSummaryStyles')) return;
    const s = document.createElement('style'); s.id = 'patientFinancialSummaryStyles';
    s.textContent = `#patientFinancialModal{position:fixed;inset:0;z-index:99999;background:rgba(12,18,38,.55);display:flex;align-items:center;justify-content:center;padding:18px}#patientFinancialModal .pf-card{width:min(760px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2)}#patientFinancialModal .pf-head{display:flex;justify-content:space-between;gap:12px;align-items:center}#patientFinancialModal .pf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:15px 0}#patientFinancialModal .pf-stat{border:1px solid #e4e8f0;border-radius:12px;padding:13px;background:#f8f9fc}#patientFinancialModal .pf-label{font-size:12px;color:#667085}#patientFinancialModal .pf-value{font-size:20px;font-weight:900;margin-top:5px;color:#17214f}#patientFinancialModal .pf-row{border:1px solid #e4e8f0;border-radius:12px;padding:12px;margin-top:8px}.pf-balance{color:#9b5c00;font-weight:900}@media(max-width:650px){#patientFinancialModal .pf-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  function close() { document.getElementById('patientFinancialModal')?.remove(); }

  async function open(patientId, patientName, mrn) {
    styles(); close();
    const modal = document.createElement('div'); modal.id='patientFinancialModal';
    modal.innerHTML = `<div class="pf-card"><div class="pf-head"><div><h2>💰 ${tr('الملخص المالي للمريض','Patient Financial Snapshot')}</h2><div class="muted">👤 ${esc(patientName||'—')} · 🆔 ${esc(mrn||'—')}</div></div><button type="button" class="btn btn-secondary" id="pfClose">✕</button></div><div id="pfBody" class="p360-content"><div class="empty">⏳ ${tr('جاري تحميل البيانات المالية...','Loading financial data...')}</div></div></div>`;
    document.body.appendChild(modal); document.getElementById('pfClose').onclick=close; modal.onclick=e=>{if(e.target===modal)close()};
    try {
      const { invoices, payments } = await getFinancialSummary(patientId);
      const invoiced = invoices.reduce((n,x)=>n+Number(x.total||0),0);
      const paid = payments.reduce((n,x)=>n+Number(x.amount||0),0);
      const balance = Math.max(0,invoiced-paid);
      const rows = invoices.length ? invoices.map(i=>{
        const p=payments.filter(x=>String(x.invoice_id)===String(i.id)).reduce((n,x)=>n+Number(x.amount||0),0);
        return `<div class="pf-row"><strong>🧾 ${esc(i.invoice_number||'—')}</strong><div class="patient-meta">${tr('الإجمالي','Total')}: ${money(i.total)} · ${tr('المدفوع','Paid')}: ${money(p)} · <span class="pf-balance">${tr('المتبقي','Balance')}: ${money(Math.max(0,Number(i.total||0)-p))}</span></div><div class="patient-meta">🚦 ${esc(i.status||'—')}</div></div>`
      }).join(''):`<div class="empty">📭 ${tr('لا توجد فواتير لهذا المريض حاليًا.','No invoices are currently linked to this patient.')}</div>`;
      document.getElementById('pfBody').innerHTML=`<div class="pf-grid"><div class="pf-stat"><div class="pf-label">${tr('الفواتير','Invoiced')}</div><div class="pf-value">${money(invoiced)}</div></div><div class="pf-stat"><div class="pf-label">${tr('المدفوع','Collected')}</div><div class="pf-value">${money(paid)}</div></div><div class="pf-stat"><div class="pf-label">${tr('المتبقي','Outstanding')}</div><div class="pf-value pf-balance">${money(balance)}</div></div></div><h3>🧾 ${tr('الفواتير','Invoices')}</h3>${rows}`;
    } catch(e) { document.getElementById('pfBody').innerHTML=`<div class="error">❌ ${esc(e.message)}</div>`; }
  }

  function mount() {
    const list=document.getElementById('patientsList'); if(!list || list.dataset.pfMounted==='1') return;
    list.dataset.pfMounted='1';
    const observer=new MutationObserver(()=>{
      list.querySelectorAll('[data-p360]').forEach(btn=>{
        if(btn.parentElement?.querySelector('[data-pf]')) return;
        const id=btn.dataset.p360; const card=btn.closest('.patient-card'); const name=card?.querySelector('.patient-name')?.textContent?.trim()||''; const mrn=card?.querySelector('.patient-mrn')?.textContent?.replace(/^🆔\s*/,'').trim()||'';
        const b=document.createElement('button'); b.type='button'; b.className='btn btn-secondary'; b.dataset.pf='1'; b.textContent=`💰 ${tr('المالية','Finance')}`; b.onclick=()=>open(id,name,mrn); btn.parentElement.appendChild(b);
      });
    });
    observer.observe(list,{childList:true,subtree:true});
  }

  function boot(){ mount(); setTimeout(mount,500); setTimeout(mount,1500); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
