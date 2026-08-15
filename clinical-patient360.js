/* AZAAD CLINIC — Patient 360 clinical trend layer
   Read-only UI: consumes data-clinical-history JSON on the host element.
   No diagnosis, treatment change, or autonomous clinical action. */
(() => {
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(host){
    if(host.querySelector('.azaad-patient360'))return;
    let history=[];try{history=JSON.parse(host.getAttribute('data-clinical-history')||'[]')}catch{}
    history=Array.isArray(history)?history.filter(x=>Number.isFinite(Number(x.score))):[];
    const latest=history.at(-1), previous=history.at(-2);
    const delta=latest&&previous?Number(latest.score)-Number(previous.score):null;
    const direction=delta===null?'غير كافٍ من البيانات':delta>0?'تحسن في المؤشر':delta<0?'انخفاض في المؤشر':'مستقر';
    const section=document.createElement('section');section.className='azaad-patient360 card';
    section.innerHTML=`<div class="panel-head"><div><h3>🧑‍⚕️ Patient 360</h3><p class="muted">اتجاهات التقييم المسجلة بواسطة الطبيب/المعالج.</p></div></div><div class="stats"><div class="stat"><div class="stat-number">${latest?esc(latest.score)+'%':'—'}</div><div class="muted">آخر نتيجة</div></div><div class="stat"><div class="stat-number">${history.length}</div><div class="muted">الجلسات المسجلة</div></div><div class="stat"><div class="stat-number">${esc(direction)}</div><div class="muted">الاتجاه</div></div></div><div class="notice">🚦 ${delta===null?'يحتاج النظام إلى جلستين مسجلتين على الأقل للمقارنة الزمنية.':'المؤشر تغيّر بمقدار '+(delta>0?'+':'')+delta+' نقطة منذ آخر جلسة.'} هذه إشارة وصفية وليست تشخيصًا.</div><div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>النتيجة</th><th>ملاحظة</th></tr></thead><tbody>${history.slice(-12).reverse().map(x=>`<tr><td>${esc(x.date||'—')}</td><td>${esc(x.score)}%</td><td>${esc(x.note||'—')}</td></tr>`).join('')||'<tr><td colspan="3">لا توجد تقييمات مسجلة.</td></tr>'}</tbody></table></div>`;
    host.appendChild(section);
  }
  function boot(){document.querySelectorAll('[data-clinical-history]').forEach(render)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.AZAADPatient360={refresh:boot};
})();
