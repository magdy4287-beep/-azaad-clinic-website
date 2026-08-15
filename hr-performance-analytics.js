/* AZAAD CLINIC — HR performance analytics, read-only */
(() => {
  'use strict';
  const client=()=>window.AZAAD?.supabase||window.supabaseClient||window.supabase;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function load(){
    const c=client(); if(!c)return;
    const [{data:staff,error:e1},{data:perf,error:e2}]=await Promise.all([
      c.from('clinic_staff').select('id,full_name,role,active'),
      c.from('clinic_employee_performance_monthly').select('staff_id,full_name,role,performance_month,followups_handled,rebookings,no_show_recoveries,avg_followup_hours,overdue_tasks,payments_collected').order('performance_month',{ascending:false})
    ]); if(e1||e2)return;
    const host=document.getElementById('azaadHrExecutive'); if(!host)return;
    const rows=(perf||[]).map(p=>{const s=(staff||[]).find(x=>x.id===p.staff_id);return {...p,active:s?.active!==false};});
    const score=p=>Math.max(0,Math.min(100,Number(p.followups_handled||0)*2+Number(p.rebookings||0)*3+Number(p.no_show_recoveries||0)*3-Number(p.overdue_tasks||0)*4));
    const ranked=[...rows].sort((a,b)=>score(b)-score(a));
    const section=document.createElement('div'); section.className='azaad-hr-performance';
    section.innerHTML=`<h3>📈 أداء الموظفين</h3><p class="muted">مؤشرات تشغيلية شهرية — لا تستخدم لاتخاذ قرار HR آلي.</p><div class="table-wrap"><table><thead><tr><th>الموظف</th><th>الدور</th><th>المتابعات</th><th>إعادة الحجز</th><th>استعادة No-show</th><th>المهام المتأخرة</th><th>المؤشر</th></tr></thead><tbody>${ranked.slice(0,25).map(p=>`<tr><td>${esc(p.full_name||'—')}</td><td>${esc(p.role||'—')}</td><td>${Number(p.followups_handled||0)}</td><td>${Number(p.rebookings||0)}</td><td>${Number(p.no_show_recoveries||0)}</td><td>${Number(p.overdue_tasks||0)}</td><td>${score(p).toFixed(0)}%</td></tr>`).join('')}</tbody></table></div>`;
    host.appendChild(section);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
