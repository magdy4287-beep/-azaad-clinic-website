/* AZAAD CLINIC — Clinical Assessment Engine
   UI-only, advisory workflow. No diagnosis/treatment decisions. */
(() => {
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const QUESTIONS=[
    {id:'q1',text:'هل ظهرت تغيرات ملحوظة في الأعراض منذ الزيارة السابقة؟',source:'Clinician-authored question'},
    {id:'q2',text:'هل التزم المريض بالخطة المتفق عليها منذ الزيارة السابقة؟',source:'Clinician-authored question'},
    {id:'q3',text:'هل ظهرت مشكلة جديدة تستحق مراجعة الطبيب؟',source:'Clinician-authored question'},
    {id:'q4',text:'هل توجد حاجة لمتابعة أقرب من الموعد المعتاد؟',source:'Clinician-authored question'}
  ];
  function mount(root){
    if(root.querySelector('.azaadClinicalAssessment'))return;
    const box=document.createElement('section');box.className='card azaadClinicalAssessment';
    box.innerHTML=`<div class="panel-head"><div><h3>🧑‍⚕️ Clinical Session Assistant</h3><p class="muted">أسئلة مساعدة أثناء الجلسة — القرار والتفسير النهائي للطبيب/المعالج.</p></div><button type="button" class="btn btn-secondary" data-reset>إعادة ضبط</button></div><div class="notice">🛡️ هذه الأسئلة ليست تشخيصًا طبيًا ولا بديلًا عن المقاييس المعتمدة أو الحكم السريري.</div><div data-questions></div><div class="stats"><div class="stat"><div class="stat-number" data-score>—</div><div class="muted">نسبة الإجابات الإيجابية</div></div><div class="stat"><div class="stat-number" data-answered>0/4</div><div class="muted">تمت الإجابة</div></div></div><div class="notice" data-trend>أكمل الإجابات لعرض ملخص الجلسة.</div>`;
    root.appendChild(box);
    const qhost=box.querySelector('[data-questions]');
    const state={};
    function render(){
      qhost.innerHTML=QUESTIONS.map(q=>`<div class="assessment-question" data-q="${q.id}"><div><strong>${esc(q.text)}</strong><div class="muted">${esc(q.source)}</div></div><div class="actions"><button type="button" class="btn btn-success" data-answer="yes">✅ نعم</button><button type="button" class="btn btn-secondary" data-answer="no">❌ لا</button></div></div>`).join('');
      qhost.querySelectorAll('[data-q]').forEach(row=>row.querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>{state[row.dataset.q]=btn.dataset.answer;row.querySelectorAll('[data-answer]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));update()})));
    }
    function update(){const answered=Object.keys(state).length;const yes=Object.values(state).filter(v=>v==='yes').length;box.querySelector('[data-answered]').textContent=`${answered}/${QUESTIONS.length}`;box.querySelector('[data-score]').textContent=answered?`${Math.round(yes/answered*100)}%`:'—';box.querySelector('[data-trend]').textContent=answered<QUESTIONS.length?'أكمل بقية الأسئلة. النتيجة وصفية ولا تعني تحسنًا أو تدهورًا طبيًا.':'اكتملت الإجابات. قارن النتيجة بالجلسات السابقة والمقاييس المعتمدة قبل اتخاذ أي قرار.'}
    box.querySelector('[data-reset]').addEventListener('click',()=>{Object.keys(state).forEach(k=>delete state[k]);render();update()});render();
  }
  window.AZAADClinicalAssessment={mount};
  document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('[data-clinical-assessment]').forEach(mount)},{once:true});
})();
