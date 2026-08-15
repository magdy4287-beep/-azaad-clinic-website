/* AZAAD CLINIC — EXECUTIVE AI DASHBOARD FOUNDATION */
(function(){'use strict';
const ExecutiveAI={
  calculate(m={}){
    const n=k=>Number.isFinite(Number(m[k]))?Number(m[k]):0;
    const appointments=n('appointments'), completed=n('completed');
    const revenue=n('revenue'), expenses=n('expenses');
    return {appointments,completed,revenue,expenses,net:revenue-expenses,
      completionRate:appointments?Math.round(completed/appointments*100):0,
      outstanding:n('outstanding'), noShows:n('noShows'), employees:n('employees')};
  },
  recommendations(m){const x=this.calculate(m),r=[];
    if(x.outstanding>0)r.push('Review outstanding balances and collection workflow.');
    if(x.noShows>0)r.push('Review reminders and no-show follow-up.');
    if(x.completionRate<70)r.push('Review scheduling and operational bottlenecks.');
    if(x.expenses>x.revenue&&x.revenue>0)r.push('Review expense categories and the current period before budget decisions.');
    return r.length?r:['No major exception detected from the supplied verified metrics.'];},
  render(el,m){if(!el)return;const x=this.calculate(m),en=(document.documentElement.lang||'').toLowerCase().startsWith('en');
    const t=en?['Executive AI','Revenue','Expenses','Net','Appointments','Completion','Outstanding','No-shows','Employees','Recommendations']:['الذكاء الاصطناعي للإدارة','الإيرادات','المصروفات','صافي التشغيل','الحجوزات','الإنجاز','المستحقات','عدم الحضور','الموظفون','الاقتراحات'];
    el.innerHTML=`<section class="azaad-executive-ai" dir="auto"><h3>🧠 ${t[0]}</h3><div class="azaad-exec-grid">${[[t[1],x.revenue],[t[2],x.expenses],[t[3],x.net],[t[4],x.appointments],[t[5],x.completionRate+'%'],[t[6],x.outstanding],[t[7],x.noShows],[t[8],x.employees]].map(a=>`<div><b>${a[0]}</b><strong>${a[1].toLocaleString?a[1].toLocaleString():a[1]}</strong></div>`).join('')}</div><h4>💡 ${t[9]}</h4><ul>${this.recommendations(m).map(a=>`<li>${a}</li>`).join('')}</ul><small>AI is advisory; verified clinic records remain authoritative.</small></section>`;
  }
};window.AzaadExecutiveAI=ExecutiveAI;})();
