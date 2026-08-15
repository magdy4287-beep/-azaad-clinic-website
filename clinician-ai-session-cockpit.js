/* Azaad Clinic — Clinician AI Session Cockpit
 * Safe UI-first layer: clinician remains the decision maker.
 * Validated instruments must be wired to their official scoring/licensing rules before production use.
 */
(() => {
  'use strict';
  if (window.__AZAAD_CLINICIAN_AI_COCKPIT__) return;
  window.__AZAAD_CLINICIAN_AI_COCKPIT__ = true;

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const patientId = () => window.CURRENT_PATIENT_ID || new URLSearchParams(location.search).get('patient_id') || document.body.dataset.patientId || '';
  const visitId = () => window.CURRENT_VISIT_ID || new URLSearchParams(location.search).get('visit_id') || document.body.dataset.visitId || '';
  const lang = () => (localStorage.getItem('azaadClinicLanguage') || document.documentElement.lang || 'ar').startsWith('en') ? 'en' : 'ar';

  const COPY = {
    ar: {
      title:'🧠 المساعد الذكي للجلسة', sub:'لوحة سريرية سريعة للطبيب/المعالج أثناء الجلسة — القرار السريري للطبيب دائمًا.',
      start:'بدء التقييم', finish:'إنهاء الجلسة', save:'حفظ المسودة', add:'➕ إضافة سؤال', fav:'⭐ المفضلة', source:'📚 المصدر', note:'ملاحظة الطبيب', yes:'✅ نعم / موجود', no:'❌ لا / غير موجود', skip:'تخطي / غير مُقيّم', score:'النسبة الحالية', trend:'الاتجاه', baseline:'خط الأساس', previous:'الزيارة السابقة', next:'الجلسة القادمة', suggest:'🤖 اقتراح موعد', transfer:'🔁 تحويل لطبيب آخر', improving:'🟢 مؤشرات تحسن', stable:'🟡 المؤشرات مستقرة/مختلطة', worsening:'🔴 توجد مؤشرات تراجع', insufficient:'⚪ بيانات غير كافية', ai:'🤖 اقتراح AI', approve:'اعتماد السؤال', reject:'رفض', clinical:'قرار سريري', draft:'مسودة محفوظة محليًا لهذه الجلسة فقط', safety:'⚠️ أي تنبيه أمان يحتاج مراجعة الطبيب واتباع بروتوكول العيادة المعتمد.'
    },
    en: {
      title:'🧠 AI Session Copilot', sub:'A focused clinician workspace — the clinician remains responsible for clinical decisions.',
      start:'Start assessment', finish:'Finish session', save:'Save draft', add:'➕ Add question', fav:'⭐ Favorites', source:'📚 Source', note:'Clinician note', yes:'✅ Yes / Present', no:'❌ No / Absent', skip:'Skip / Not assessed', score:'Current score', trend:'Trend', baseline:'Baseline', previous:'Previous visit', next:'Next session', suggest:'🤖 Suggest time', transfer:'🔁 Transfer patient', improving:'🟢 Improving indicators', stable:'🟡 Stable / mixed indicators', worsening:'🔴 Worsening indicators', insufficient:'⚪ Insufficient data', ai:'🤖 AI candidate', approve:'Approve question', reject:'Reject', clinical:'Clinical decision', draft:'Draft saved locally for this session only', safety:'⚠️ Safety alerts require clinician review and the clinic-approved safety protocol.'
    }
  };

  const QUESTIONS = [
    {id:'mood', domain:'Mood', text:{ar:'خلال الفترة منذ الزيارة السابقة، كيف تصف مزاجك بشكل عام؟',en:'Since the previous visit, how would you describe your overall mood?'}, source:'Clinic clinician-authored starter question', ai:false},
    {id:'anxiety', domain:'Anxiety', text:{ar:'هل أثرت مشاعر القلق على نشاطك اليومي؟',en:'Have anxiety symptoms affected your daily activities?'}, source:'Clinic clinician-authored starter question', ai:false},
    {id:'sleep', domain:'Sleep', text:{ar:'هل حدث تغير ملحوظ في النوم منذ الزيارة السابقة؟',en:'Has there been a noticeable change in sleep since the previous visit?'}, source:'Clinic clinician-authored starter question', ai:false},
    {id:'function', domain:'Function', text:{ar:'هل ترى تحسنًا في قدرتك على أداء مهامك اليومية؟',en:'Do you notice improvement in your ability to perform daily activities?'}, source:'Clinic clinician-authored starter question', ai:false},
    {id:'engagement', domain:'Therapy', text:{ar:'هل استطعت تطبيق المهارات أو التمارين التي اتفقت عليها مع المعالج؟',en:'Were you able to practice the skills or exercises agreed with your therapist?'}, source:'Clinic clinician-authored starter question', ai:false}
  ];

  let state = {answers:{}, notes:'', started:false, approvedAI:[]};
  const storageKey = () => `azaad_clinical_session_draft:${patientId()}:${visitId() || 'new'}`;

  function loadDraft(){
    try { const raw=sessionStorage.getItem(storageKey()); if(raw) state={...state,...JSON.parse(raw)}; } catch (_) {}
  }
  function saveDraft(){
    try { sessionStorage.setItem(storageKey(), JSON.stringify(state)); toast(COPY[lang()].draft); } catch (_) { toast('Draft storage unavailable'); }
  }
  function toast(message){
    let t=$('azaadAiToast'); if(!t){t=document.createElement('div');t.id='azaadAiToast';t.style.cssText='position:fixed;bottom:18px;left:18px;right:18px;max-width:520px;margin:auto;background:#18213d;color:#fff;padding:12px 16px;border-radius:12px;z-index:9999;text-align:center;box-shadow:0 12px 35px rgba(0,0,0,.2)';document.body.appendChild(t)}
    t.textContent=message; t.hidden=false; clearTimeout(t.__timer); t.__timer=setTimeout(()=>t.hidden=true,2600);
  }

  function score(){
    const vals=Object.values(state.answers).filter(v=>v==='yes'||v==='no');
    if(!vals.length) return null;
    return Math.round(vals.filter(v=>v==='yes').length / vals.length * 100);
  }
  function trend(s){ if(s===null) return COPY[lang()].insufficient; if(s>=70) return COPY[lang()].improving; if(s>=45) return COPY[lang()].stable; return COPY[lang()].worsening; }

  function render(){
    const host=document.querySelector('#clinicalAssessmentApp') || document.querySelector('#patient360') || document.querySelector('main');
    if(!host || $('azaadClinicianAICockpit')) return;
    loadDraft();
    const c=COPY[lang()];
    const box=document.createElement('section'); box.id='azaadClinicianAICockpit';
    box.style.cssText='margin:18px 0;border-radius:20px;padding:18px;background:linear-gradient(135deg,#f7fbff,#ffffff);border:1px solid #dbe6f4;box-shadow:0 10px 35px rgba(24,33,61,.07)';
    box.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
        <div><h2 style="margin:0 0 6px">${c.title}</h2><div style="color:#68738a">${c.sub}</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button id="aiStart" class="btn btn-primary">${c.start}</button><button id="aiSave" class="btn btn-secondary">${c.save}</button></div>
      </div>
      <div id="aiMetrics" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0">
        <div class="card"><b>${c.score}</b><div id="aiScore" style="font-size:30px;font-weight:900">—</div></div>
        <div class="card"><b>${c.trend}</b><div id="aiTrend">${c.insufficient}</div></div>
        <div class="card"><b>${c.baseline}</b><div>—</div></div>
        <div class="card"><b>${c.previous}</b><div>—</div></div>
      </div>
      <div id="aiQuestions"></div>
      <div style="margin-top:12px"><label style="display:block;font-weight:700">${c.note}<textarea id="aiNote" rows="3" style="width:100%;margin-top:7px"></textarea></label></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button id="aiAdd" class="btn btn-secondary">${c.add}</button><button id="aiSuggest" class="btn btn-secondary">${c.suggest}</button><button id="aiTransfer" class="btn btn-secondary">${c.transfer}</button><button id="aiFinish" class="btn btn-primary">${c.finish}</button></div>
      <div style="margin-top:12px;padding:10px;border-radius:12px;background:#fff8e6;color:#6b5700">${c.safety}</div>`;
    host.prepend(box);
    $('aiNote').value=state.notes||'';
    $('aiStart').onclick=()=>{state.started=true;renderQuestions();toast(c.start)};
    $('aiSave').onclick=()=>{state.notes=$('aiNote').value;saveDraft()};
    $('aiFinish').onclick=()=>{state.notes=$('aiNote').value;saveDraft();toast(c.finish+' — review before submission')};
    $('aiAdd').onclick=addQuestion;
    $('aiSuggest').onclick=()=>toast(lang()==='en'?'Scheduling suggestion will use clinic availability and approved rules.':'سيستخدم اقتراح الموعد توافر العيادة والقواعد المعتمدة.');
    $('aiTransfer').onclick=()=>{document.querySelector('#clinicianTransferWidget')?.scrollIntoView({behavior:'smooth',block:'center'});toast(lang()==='en'?'Transfer workspace opened below.':'تم فتح مساحة تحويل المريض بالأسفل.')};
    renderQuestions(); updateMetrics();
  }

  function renderQuestions(){
    const wrap=$('aiQuestions'); if(!wrap)return;
    const c=COPY[lang()];
    wrap.innerHTML=QUESTIONS.map(q=>{const a=state.answers[q.id]||'';return `<article style="border:1px solid #e2e8f0;border-radius:16px;padding:14px;margin:10px 0;background:#fff"><div style="display:flex;justify-content:space-between;gap:10px"><div><span style="font-size:11px;background:#edf3ff;padding:4px 8px;border-radius:12px">${esc(q.domain)}</span><h3 style="margin:9px 0">${esc(q.text[lang()])}</h3><div style="font-size:12px;color:#7a8498">${c.source}: ${esc(q.source)}</div></div><div style="font-size:12px">${q.ai?c.ai:''}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn ${a==='yes'?'success':'secondary'}" data-answer="yes" data-q="${q.id}">${c.yes}</button><button class="btn ${a==='no'?'danger':'secondary'}" data-answer="no" data-q="${q.id}">${c.no}</button><button class="btn ${!a?'secondary':''}" data-answer="skip" data-q="${q.id}">${c.skip}</button></div></article>`}).join('');
    wrap.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{const q=b.dataset.q,v=b.dataset.answer; if(v==='skip')delete state.answers[q]; else state.answers[q]=v; updateMetrics(); renderQuestions();});
  }
  function updateMetrics(){const s=score(); if($('aiScore'))$('aiScore').textContent=s===null?'—':s+'%'; if($('aiTrend'))$('aiTrend').textContent=trend(s);}
  function addQuestion(){
    const c=COPY[lang()];
    const text=prompt(lang()==='en'?'Enter a clinician-authored question:':'اكتب سؤالًا من تأليف الطبيب/المعالج:');
    if(!text?.trim())return;
    const q={id:'custom_'+Date.now(),domain:'Custom',text:{ar:text.trim(),en:text.trim()},source:'Clinician-authored — not a validated instrument',ai:false}; QUESTIONS.push(q); renderQuestions(); toast(c.approve+' ✓');
  }
  function observeLanguage(){
    const obs=new MutationObserver(()=>{if($('azaadClinicianAICockpit')){const old=$('azaadClinicianAICockpit');old.remove();render();}}); obs.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }
  function init(){setTimeout(()=>{render();observeLanguage();},250);}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
