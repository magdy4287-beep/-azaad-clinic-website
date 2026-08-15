/* AZAAD CLINIC — Finance Executive Dashboard
   Read-only KPI layer. No financial mutations. */
(() => {
  'use strict';
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'EGP',maximumFractionDigits:2}).format(Number(n||0));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client=()=>window.AZAAD?.supabase||window.supabaseClient||window.supabase;
  async function rows(table,select){const c=client(); if(!c)return[]; const r=await c.from(table).select(select); if(r.error)throw r.error; return r.data||[];}
  async function render(){
    if(document.getElementById('azaadFinanceExecutive'))return;
    const host=document.querySelector('#adminPage .tabs')?.parentElement||document.querySelector('#adminPage'); if(!host)return;
    const card=document.createElement('section'); card.id='azaadFinanceExecutive'; card.className='card';
    card.innerHTML='<div class="panel-head"><div><h2>📊 Finance Executive Dashboard</h2><p class="muted">مؤشرات مالية تشغيلية للمدير والإدارة — قراءة فقط.</p></div><button id="azaadFinanceRefresh" class="btn btn-secondary">🔄 تحديث</button></div><div id="azaadFinanceKpis" class="stats"><div class="empty">جاري التحميل...</div></div><div id="azaadFinanceAdvice" class="notice"></div>';
    host.appendChild(card);
    async function load(){
      const invoices=await rows('clinic_invoices','id,total,status,created_at');
      const payments=await rows('clinic_payments','invoice_id,amount,verification_status');
      const total=invoices.reduce((s,x)=>s+Number(x.total||0),0);
      const paid=payments.filter(x=>x.verification_status==='verified').reduce((s,x)=>s+Number(x.amount||0),0);
      const outstanding=Math.max(total-paid,0);
      const collection=total?Math.min((paid/total)*100,100):0;
      document.getElementById('azaadFinanceKpis').innerHTML=[['الفواتير',invoices.length],['الإجمالي',money(total)],['المدفوع المؤكد',money(paid)],['المتبقي',money(outstanding)],['نسبة التحصيل',collection.toFixed(1)+'%']].map(x=>`<div class="stat"><div class="stat-number">${esc(x[1])}</div><div class="muted">${esc(x[0])}</div></div>`).join('');
      document.getElementById('azaadFinanceAdvice').innerHTML=collection<70?'🤖 <strong>اقتراح:</strong> راجع الحالات غير المسددة والمتابعات المالية قبل اتخاذ أي إجراء.':'🤖 <strong>مؤشر إيجابي:</strong> نسبة التحصيل الحالية جيدة. راجع الاتجاهات الزمنية قبل اتخاذ قرارات تشغيلية.';
    }
    document.getElementById('azaadFinanceRefresh').onclick=load; await load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
