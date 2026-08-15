/* AZAAD CLINIC — Finance period analytics, read-only */
(() => {
  'use strict';
  const client=()=>window.AZAAD?.supabase||window.supabaseClient||window.supabase;
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'EGP',maximumFractionDigits:2}).format(Number(n||0));
  async function load(){
    const c=client(); if(!c)return;
    const {data,error}=await c.from('clinic_invoices').select('total,status,created_at');
    if(error)return;
    const now=new Date(), y=now.getFullYear(), m=now.getMonth();
    const monthly=(data||[]).filter(x=>{const d=new Date(x.created_at);return d.getFullYear()===y&&d.getMonth()===m;});
    const annual=(data||[]).filter(x=>new Date(x.created_at).getFullYear()===y);
    const host=document.getElementById('azaadFinanceExecutive'); if(!host)return;
    const old=host.querySelector('.azaad-finance-periods');
    const el=old||document.createElement('div'); el.className='azaad-finance-periods';
    el.innerHTML=`<div class="stats"><div class="stat"><div class="stat-number">${monthly.length}</div><div class="muted">فواتير الشهر الحالي</div></div><div class="stat"><div class="stat-number">${money(monthly.reduce((s,x)=>s+Number(x.total||0),0))}</div><div class="muted">إجمالي الشهر الحالي</div></div><div class="stat"><div class="stat-number">${annual.length}</div><div class="muted">فواتير السنة الحالية</div></div><div class="stat"><div class="stat-number">${money(annual.reduce((s,x)=>s+Number(x.total||0),0))}</div><div class="muted">إجمالي السنة الحالية</div></div></div>`;
    if(!old)host.appendChild(el);
  }
  document.addEventListener('DOMContentLoaded',()=>{load();setInterval(load,60000)},{once:true});
})();
