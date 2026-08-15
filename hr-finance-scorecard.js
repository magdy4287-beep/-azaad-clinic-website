/* AZAAD CLINIC — HR/Finance scorecard, read-only */
(() => {
  'use strict';
  const client=()=>window.AZAAD?.supabase||window.supabaseClient||window.supabase;
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'EGP',maximumFractionDigits:2}).format(Number(n||0));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function load(){
    const c=client(); if(!c)return;
    const [{data:hr},{data:perf},{data:pay}]=await Promise.all([
      c.from('clinic_staff_hr').select('staff_id,full_name,job_title,base_salary,commission_type,commission_value,target_monthly_visits,target_monthly_revenue'),
      c.from('clinic_employee_performance_monthly').select('staff_id,full_name,role,followups_handled,rebookings,no_show_recoveries,overdue_tasks,payments_collected,performance_month').order('performance_month',{ascending:false}),
      c.from('clinic_payments').select('amount,verification_status,created_at')
    ]);
    const host=document.getElementById('azaadHrExecutive'); if(!host)return;
    const latest=new Map(); (perf||[]).forEach(x=>{if(!latest.has(x.staff_id))latest.set(x.staff_id,x)});
    const totalCollected=(pay||[]).filter(x=>x.verification_status==='verified').reduce((s,x)=>s+Number(x.amount||0),0);
    const rows=(hr||[]).map(x=>{const p=latest.get(x.staff_id)||{};const productivity=Number(p.followups_handled||0)+Number(p.rebookings||0)*1.5+Number(p.no_show_recoveries||0)*1.5-Number(p.overdue_tasks||0);return {...x,...p,productivity};}).sort((a,b)=>b.productivity-a.productivity);
    const old=host.querySelector('.azaad-hr-finance-scorecard'); if(old)old.remove();
    const section=document.createElement('div');section.className='azaad-hr-finance-scorecard';
    section.innerHTML=`<h3>💼 HR × Finance Scorecard</h3><p class="muted">تحليل تشغيلي للمدير — البيانات المالية التفصيلية للموظف تخضع للصلاحيات.</p><div class="notice">💰 التحصيل المؤكد للعيادة: <strong>${money(totalCollected)}</strong></div><div class="table-wrap"><table><thead><tr><th>الموظف</th><th>الوظيفة</th><th>الإنتاجية</th><th>الهدف الشهري</th><th>التحصيل المرتبط</th></tr></thead><tbody>${rows.slice(0,25).map(x=>`<tr><td>${esc(x.full_name||'—')}</td><td>${esc(x.job_title||x.role||'—')}</td><td>${x.productivity.toFixed(1)}</td><td>${Number(x.target_monthly_visits||0)} زيارة / ${money(x.target_monthly_revenue)}</td><td>${money(x.payments_collected)}</td></tr>`).join('')}</tbody></table></div><div class="notice">🤖 <strong>HR/Finance AI:</strong> استخدم هذه المؤشرات لاكتشاف فرص تحسين الأداء والتوزيع والتدريب فقط. لا يتم تعديل الرواتب أو العمولات تلقائيًا.</div>`;
    host.appendChild(section);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
