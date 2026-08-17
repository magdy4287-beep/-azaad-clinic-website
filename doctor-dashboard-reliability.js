/* AZAAD Doctor Dashboard — interaction reliability layer */
(() => {
  'use strict';
  const URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const ASSESS = `${URL}/functions/v1/azaad-clinical-assessments`;
  const AI = `${URL}/functions/v1/azaad-doctor-ai`;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const session = () => window.AZAAD?.state?.session || null;
  const state = { templates: [], questions: [] };
  async function request(url, method='GET', params={}, body=null) {
    const s=session(); if(!s?.access_token) throw new Error('جلسة الطبيب غير موجودة أو منتهية.');
    const u=new globalThis.URL(url); Object.entries(params).forEach(([k,v])=>v!==''&&v!=null&&u.searchParams.set(k,v));
    const r=await fetch(u,{method,headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${s.access_token}`,apikey:KEY},body:method==='POST'?JSON.stringify(body):undefined,cache:'no-store'});
    const b=await r.json().catch(()=>({})); if(!r.ok) throw new Error(b?.error||b?.message||`HTTP ${r.status}`); return b;
  }
  function context(){
    const ws=window.__AZAAD_DOCTOR_WORKSPACE__||null;
    if(ws?.patient?.id) return {patientId:ws.patient.id,bookingId:ws.__selectedBooking?.id||'',visitId:ws.__activeVisitId||''};
    const buttons=[...document.querySelectorAll('#scheduleList [data-open-patient][data-booking]')];
    const visible=buttons.find(b=>{const row=b.closest('.row');return row&&!row.hidden;})||buttons[0];
    return {patientId:visible?.dataset.openPatient||'',bookingId:visible?.dataset.booking||'',visitId:''};
  }
  function message(text,ok=false){const el=$('error');if(!el)return;el.hidden=false;el.textContent=(ok?'✅ ':'❌ ')+text;el.style.background=ok?'#e9f9ef':'#fff0f0';el.style.color=ok?'#087443':'#a21c1c';}
  async function loadAssessment(){
    const c=context(); if(!c.patientId){message('افتح ملف المريض ثم ابدأ الزيارة قبل تحميل الأسئلة.');return;}
    const b=await request(ASSESS,'GET',{action:'templates'}); state.templates=b.templates||[];state.questions=b.questions||[];
    const select=$('assessmentTemplate');if(!select)return;select.innerHTML=state.templates.map(t=>`<option value="${esc(t.id)}">${esc(t.name_ar||t.name||t.specialty||t.id)}</option>`).join('');renderQuestions();message('تم تحميل أسئلة التقييم المعتمدة من النظام.',true);
  }
  function renderQuestions(){
    const select=$('assessmentTemplate'),root=$('questions');if(!select||!root)return;const rows=state.questions.filter(q=>String(q.template_id)===String(select.value));
    if(!rows.length){root.innerHTML='<div class="notice">لا توجد أسئلة نشطة ومعتمدة لهذا التقييم.</div>';return;}
    root.innerHTML=rows.map((q,i)=>{const type=String(q.response_type||'text').toLowerCase(),title=q.question_text_ar||q.question_text||`Question ${i+1}`;
      if(['boolean','yes_no','true_false'].includes(type))return `<div class="question"><div class="qmeta">#${i+1}</div><div class="qtitle">${esc(title)}</div><div class="options"><label class="option"><input required type="radio" name="q_${esc(q.id)}" value="true"> نعم / Yes</label><label class="option"><input required type="radio" name="q_${esc(q.id)}" value="false"> لا / No</label></div></div>`;
      if(['number','numeric','score'].includes(type))return `<div class="question"><div class="qmeta">#${i+1}</div><div class="qtitle">${esc(title)}</div><input required name="q_${esc(q.id)}" type="number" step="any" style="padding:10px;border:1px solid #d5dbea;border-radius:10px;width:180px"></div>`;
      return `<div class="question"><div class="qmeta">#${i+1}</div><div class="qtitle">${esc(title)}</div><textarea required name="q_${esc(q.id)}" style="width:100%;min-height:80px;padding:10px;border:1px solid #d5dbea;border-radius:10px"></textarea></div>`;
    }).join('');
  }
  async function saveAssessment(e){
    e.preventDefault();const c=context(),templateId=$('assessmentTemplate')?.value;if(!c.patientId||!templateId){message('بيانات المريض/التقييم ناقصة.');return;}
    let visitId=c.visitId;
    if(!visitId&&c.bookingId){try{const b=await request(`${URL}/functions/v1/azaad-doctor-dashboard`,'GET',{patient_id:c.patientId});const ws=b.patient_workspace;visitId=ws?.clinical_visits?.find(v=>String(v.booking_id)===String(c.bookingId))?.id||'';}catch(_){} }
    if(!visitId){message('ابدأ الجلسة أولًا حتى يتم ربط التقييم بالزيارة.');return;}
    const rows=state.questions.filter(q=>String(q.template_id)===String(templateId));const answers=rows.map(q=>{const checked=document.querySelector(`[name="q_${CSS.escape(String(q.id))}"]:checked`),input=checked||document.querySelector(`[name="q_${CSS.escape(String(q.id))}"]`),v=input?.value??'';return{question_id:q.id,response_boolean:v==='true'?true:v==='false'?false:null,response_text:v==='true'||v==='false'?null:v};});
    if(answers.some(a=>a.response_boolean===null&&!String(a.response_text||'').trim())){message('يجب الإجابة على جميع الأسئلة قبل الحفظ.');return;}
    const b=await request(ASSESS,'POST',{}, {patient_id:c.patientId,clinical_visit_id:visitId,template_id:templateId,answers,clinician_notes:$('assessmentNotes')?.value?.trim()||''});message(`تم حفظ التقييم بنجاح. النتيجة ${b.percentage??0}%`,true);if($('chartText'))$('chartText').textContent=`آخر تقييم: ${b.percentage??0}% — ${b.answered_questions??0}/${b.total_questions??0} سؤال.`;
  }
  async function runAI(){
    const c=context(),out=$('aiResult'),button=$('runAiBtn');if(!c.patientId){message('افتح ملف المريض أولًا قبل تشغيل المساعد السريري.');return;}if(button){button.disabled=true;button.textContent='⏳ جاري تحليل الحالة...';}if(out)out.innerHTML='<div class="notice">جاري الاتصال بالمساعد السريري...</div>';
    try{const b=await request(AI,'POST',{}, {patient_id:c.patientId});const list=k=>Array.isArray(b[k])?b[k].map(x=>`<li>${esc(x)}</li>`).join(''):'<li>لا توجد</li>';if(out)out.innerHTML=`<div class="notice"><strong>🧠 الملخص</strong><br>${esc(b.summary_ar||'لا يوجد ملخص.')}</div><div class="notice"><strong>🔎 أهم النتائج</strong><ul>${list('key_findings_ar')}</ul></div><div class="notice"><strong>⚠️ إشارات تستحق المراجعة</strong><ul>${list('risk_flags_ar')}</ul></div><div class="notice"><strong>❓ أسئلة مقترحة للطبيب</strong><ul>${list('suggested_clinician_questions_ar')}</ul></div><div class="muted">${esc(b.evidence_note_ar||'')}</div>`;message('تم الاتصال بالمساعد السريري وإظهار النتيجة.',true);}catch(err){if(out)out.innerHTML=`<div class="error">${esc(err.message)}</div>`;message(`تعذر تشغيل المساعد: ${err.message}`);}finally{if(button){button.disabled=false;button.textContent='✨ تحليل الحالة بعد اكتمال التقييم';}}
  }
  async function refreshFinance(){
    const c=context();if(!c.patientId){message('افتح ملف المريض أولًا.');return;}try{const b=await request(`${URL}/functions/v1/azaad-doctor-dashboard`,'GET',{patient_id:c.patientId});const ws=b.patient_workspace||{},inv=Array.isArray(ws.invoices)?ws.invoices:[];const total=inv.reduce((n,i)=>n+Number(i.total_amount??i.total??0),0),paid=inv.reduce((n,i)=>n+Number(i.paid_amount??i.paid??0),0);const box=$('financeData');if(box)box.innerHTML=`<div class="mini-grid"><div class="mini"><b>إجمالي الفواتير</b><br>${total.toFixed(2)} EGP</div><div class="mini"><b>المدفوع</b><br>${paid.toFixed(2)} EGP</div><div class="mini"><b>المتبقي</b><br>${Math.max(total-paid,0).toFixed(2)} EGP</div></div><div class="notice" style="margin-top:10px">📊 تم تحديث بيانات الفواتير والدفع من الخادم.</div>`;message('تم تحديث بيانات الفاتورة والدفع والزيارة.',true);}catch(e){message(`تعذر تحميل البيانات المالية: ${e.message}`);}}
  function bind(){
    const form=$('assessmentForm');if(form&&!form.dataset.reliability){form.dataset.reliability='1';form.addEventListener('submit',saveAssessment,true);}
    const load=$('loadAssessmentBtn');if(load&&!load.dataset.reliability){load.dataset.reliability='1';load.addEventListener('click',()=>loadAssessment().catch(e=>message(e.message)),true);}
    const sel=$('assessmentTemplate');if(sel&&!sel.dataset.reliability){sel.dataset.reliability='1';sel.addEventListener('change',renderQuestions,true);}
    const ai=$('runAiBtn');if(ai&&!ai.dataset.reliability){ai.dataset.reliability='1';ai.addEventListener('click',runAI,true);}
    const finance=$('wsPayment');if(finance&&!finance.dataset.reliability){finance.dataset.reliability='1';const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='🔄 تحديث الفاتورة والدفع';b.style.marginTop='8px';b.onclick=refreshFinance;finance.appendChild(b);}
  }
  function init(){if(!/doctor-dashboard\.html$/i.test(location.pathname))return;bind();setInterval(bind,700);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
