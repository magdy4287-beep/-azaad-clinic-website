/* AZAAD CLINIC — Marketing Intelligence Dashboard
   Read-only planning/analytics layer. Social publishing remains human-confirmed. */
(() => {
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(){
    if(document.getElementById('azaadMarketingIntelligence'))return;
    const host=document.querySelector('#adminPage')||document.body;
    const card=document.createElement('section');card.id='azaadMarketingIntelligence';card.className='card';
    card.innerHTML=`<div class="panel-head"><div><h2>📣 Marketing Intelligence</h2><p class="muted">مركز التخطيط والتحليل للقنوات الاجتماعية — النشر النهائي يحتاج تأكيدًا بشريًا.</p></div></div><div class="stats"><div class="stat"><div class="stat-number">6</div><div class="muted">القنوات</div></div><div class="stat"><div class="stat-number">AI</div><div class="muted">اقتراحات المحتوى</div></div><div class="stat"><div class="stat-number">📊</div><div class="muted">تحليل الأداء</div></div></div><div class="table-wrap"><table><thead><tr><th>القناة</th><th>المحتوى</th><th>الهدف</th><th>حالة النشر</th></tr></thead><tbody>${['Facebook','Instagram','TikTok','LinkedIn','WhatsApp','Website'].map(x=>`<tr><td>${esc(x)}</td><td>صورة / فيديو / نص</td><td>حجوزات + تفاعل</td><td>مسودة / يحتاج تأكيد</td></tr>`).join('')}</tbody></table></div><div class="notice">🤖 <strong>Marketing AI:</strong> يمكنه اقتراح أفكار، عناوين، وصف، تقويم محتوى وحملات، لكن لا ينشر أو يرسل إعلانًا خارجيًا دون تأكيد المستخدم.</div>`;
    host.appendChild(card);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
