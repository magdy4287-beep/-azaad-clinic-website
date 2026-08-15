/* AZAAD CLINIC — RCM + FINANCE CENTER
   Read-only operational dashboard. Financial mutations stay behind existing RPC/RLS workflows.
*/
(() => {
  'use strict';
  const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'EGP',maximumFractionDigits:2}).format(Number(n||0));
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getClient = () => window.AZAAD?.supabase || window.supabaseClient || window.supabase;

  async function query(client, table, select) {
    const r = await client.from(table).select(select);
    if (r.error) throw r.error;
    return r.data || [];
  }

  async function render() {
    const client = getClient();
    if (!client) return;
    if (document.getElementById('azaadRcmFinanceCard')) return;

    const host = document.querySelector('#adminPage .tabs')?.parentElement || document.querySelector('#adminPage');
    if (!host) return;

    const card = document.createElement('section');
    card.id='azaadRcmFinanceCard'; card.className='card';
    card.innerHTML=`<div class="panel-head"><div><h2>🧾 RCM & Finance Center</h2><p class="muted">الفواتير والمدفوعات والمتبقي — عرض تشغيلي آمن بدون تعديل مالي مباشر.</p></div><button id="azaadRcmRefresh" class="btn btn-secondary">🔄 تحديث</button></div>
      <div id="azaadRcmStats" class="stats"></div><div class="filters"><input id="azaadRcmSearch" placeholder="بحث باسم المريض أو MRN أو رقم الفاتورة"><input id="azaadRcmDate" type="date"></div><div class="table-wrap"><table><thead><tr><th>الفاتورة</th><th>المريض</th><th>MRN</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead><tbody id="azaadRcmRows"><tr><td colspan="8" class="empty">جاري التحميل...</td></tr></tbody></table></div>`;
    host.appendChild(card);

    let invoices=[];
    async function load(){
      const rows = await query(client,'clinic_invoices','id,invoice_number,patient_id,booking_id,total,status,created_at');
      let patients=[]; try { patients=await query(client,'clinic_patients','id,mrn,full_name,phone'); } catch(_){}
      let payments=[]; try { payments=await query(client,'clinic_payments','invoice_id,amount,verification_status,created_at'); } catch(_){}
      const pMap=new Map(patients.map(p=>[p.id,p]));
      const paid=new Map(); payments.forEach(p=>{if(p.verification_status==='verified') paid.set(p.invoice_id,(paid.get(p.invoice_id)||0)+Number(p.amount||0));});
      invoices=rows.map(i=>{const p=pMap.get(i.patient_id)||{}; const total=Number(i.total||0), amount=paid.get(i.id)||0; return {...i,patient:p,paid:amount,balance:Math.max(total-amount,0)};});
      const total=invoices.reduce((s,i)=>s+Number(i.total||0),0), collected=invoices.reduce((s,i)=>s+i.paid,0), outstanding=invoices.reduce((s,i)=>s+i.balance,0);
      document.getElementById('azaadRcmStats').innerHTML=[['الفواتير',invoices.length],['الإجمالي',money(total)],['المدفوع',money(collected)],['المتبقي',money(outstanding)]].map(x=>`<div class="stat"><div class="stat-number">${esc(x[1])}</div><div class="muted">${esc(x[0])}</div></div>`).join('');
      draw();
    }
    function draw(){
      const q=(document.getElementById('azaadRcmSearch').value||'').trim().toLowerCase(); const d=document.getElementById('azaadRcmDate').value;
      const list=invoices.filter(i=>{const p=i.patient||{}, hay=[i.invoice_number,p.full_name,p.mrn,p.phone].join(' ').toLowerCase(); return (!q||hay.includes(q))&&(!d||String(i.created_at||'').slice(0,10)===d);});
      document.getElementById('azaadRcmRows').innerHTML=list.length?list.map(i=>`<tr><td>${esc(i.invoice_number||i.id)}</td><td>${esc(i.patient.full_name||'—')}</td><td>${esc(i.patient.mrn||'—')}</td><td>${esc(String(i.created_at||'').slice(0,10)||'—')}</td><td>${money(i.total)}</td><td>${money(i.paid)}</td><td>${money(i.balance)}</td><td>${esc(i.status||'—')}</td></tr>`).join(''):`<tr><td colspan="8" class="empty">لا توجد فواتير مطابقة.</td></tr>`;
    }
    document.getElementById('azaadRcmRefresh').onclick=load; document.getElementById('azaadRcmSearch').oninput=draw; document.getElementById('azaadRcmDate').onchange=draw;
    await load();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',render,{once:true}); else render();
  new MutationObserver(()=>{if(!document.getElementById('azaadRcmFinanceCard')) render();}).observe(document.body,{childList:true,subtree:true});
})();
