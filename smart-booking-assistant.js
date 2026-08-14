/* Azaad Clinic — Smart Booking Assistant
   Privacy rule: only scheduling data is sent to the AI provider; never send patient names,
   diagnoses, assessment answers, notes, or other clinical content.
*/
(() => {
  'use strict';
  const API='https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-booking-ai';
  const KEY='sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const token=()=>window.AZAAD?.state?.session?.access_token||'';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  async function call(body){const r=await fetch(API,{method:'POST',headers:{Authorization:`Bearer ${token()}`,apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body||{})});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`HTTP ${r.status}`);return b}
  function slotsFromDom(){return [...document.querySelectorAll('[data-booking-slot],[data-slot-time].azaad-booking-slot')].map((x,i)=>({id:x.dataset.slotId||String(i),date:x.dataset.date||'',time:x.dataset.slotTime||x.dataset.time||'',available:x.dataset.available!=='false'})).filter(x=>x.available)}
  function rank(slots,preferredDate,preferredTime){return slots.map((s,i)=>{let score=0;if(preferredDate&&s.date===preferredDate)score+=100;if(preferredTime&&s.time===preferredTime)score+=60;score+=Math.max(0,30-i);return {...s,score}}).sort((a,b)=>b.score-a.score)}
  async function suggest(input){
    const slots=Array.isArray(input?.slots)?input.slots:slotsFromDom();
    if(!slots.length)return {suggestions:[],message:'لا توجد مواعيد متاحة حاليًا.'};
    try{return await call({slots:slots.slice(0,80),preferred_date:input?.preferred_date||null,preferred_time:input?.preferred_time||null});}
    catch(_){const ranked=rank(slots,input?.preferred_date||'',input?.preferred_time||'').slice(0,5);return {suggestions:ranked,message:'تعذر الوصول إلى AI؛ تم استخدام ترتيب احتياطي آمن.',provider:'fallback'}}
  }
  function mount(host){if(!host||host.querySelector('.azaadSmartBooking'))return;const box=document.createElement('section');box.className='azaadSmartBooking card';box.innerHTML=`<div class="panel-head"><div><h3>🤖 مساعد حجز الموعد الذكي</h3><div class="muted">الذكاء الاصطناعي يتعامل مع بيانات الجدول فقط؛ لا يتم إرسال بيانات المريض الطبية أو اسمه.</div></div></div><div class="azaad-booking-legend"><span class="azaad-legend-available">🟡 متاح</span><span class="azaad-legend-booked">🟢 محجوز</span><span class="azaad-legend-completed">🔴 منتهٍ</span><span class="azaad-legend-progress">🔵 جاري</span><span class="azaad-legend-pending">🟣 انتظار</span></div><div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px"><input class="azaadSmartDate" type="date"><input class="azaadSmartTime" type="time"><button type="button" class="btn btn-secondary azaadSmartSuggest">🤖 اقترح الأفضل</button></div><div class="azaadSmartResults" style="margin-top:12px"></div>`;host.appendChild(box);box.querySelector('.azaadSmartSuggest').onclick=async()=>{const date=box.querySelector('.azaadSmartDate').value,time=box.querySelector('.azaadSmartTime').value,res=box.querySelector('.azaadSmartResults');res.textContent='🤖 جاري تحليل المواعيد المتاحة...';try{const r=await suggest({preferred_date:date,preferred_time:time});res.innerHTML=(r.suggestions||[]).map(s=>`<button type="button" class="btn btn-secondary" style="margin:4px" data-smart-date="${esc(s.date)}" data-smart-time="${esc(s.time)}">🟡 ${esc(s.date)} — ${esc(s.time)}${s.reason?` · ${esc(s.reason)}`:''}</button>`).join('')||`<div class="muted">${esc(r.message||'لا توجد اقتراحات.')}</div>`;res.querySelectorAll('[data-smart-date]').forEach(b=>b.onclick=()=>{box.querySelector('.azaadSmartDate').value=b.dataset.smartDate;box.querySelector('.azaadSmartTime').value=b.dataset.smartTime;});}catch(e){res.textContent='❌ '+e.message}}}
  function install(){const hosts=[document.querySelector('#doctorFollowupWidget'),document.querySelector('#frontdeskPanel'),document.querySelector('#clinicalAssessmentApp'),document.querySelector('main')].filter(Boolean);hosts.slice(0,1).forEach(mount)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
  window.AZAAD_SMART_BOOKING={suggest};
})();
