/* Doctor-side follow-up scheduler + clinician AI session cockpit loader.
 * Runtime data boundary: Appwrite-authenticated Neon API.
 * Follow-up date suggestion is deterministic so the free-only runtime never depends on an AI provider.
 */
(() => {
  'use strict';
  const API='/api/admin-appointments?resource=frontdesk&action=';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  async function api(action,body){
    const r=await fetch(`${API}${encodeURIComponent(action)}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body||{})});
    const b=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(b.error||`HTTP ${r.status}`);
    return b;
  }
  function patientId(){return window.CURRENT_PATIENT_ID||window.patientId||document.body.dataset.patientId||''}
  function suggestedDate(days=14){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
  function install(){
    if(document.querySelector('#doctorFollowupWidget'))return;
    const host=document.querySelector('#clinicalAssessmentApp')||document.querySelector('main')||document.body;if(!host)return;
    const box=document.createElement('section');box.id='doctorFollowupWidget';box.className='card';box.style.marginTop='16px';
    box.innerHTML=`<div class="panel-head"><div><h3>📅 موعد المتابعة</h3><div class="muted">يمكن للطبيب تحديد الموعد القادم من نفس الملف ليظهر فورًا للاستقبال والإدارة.</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px"><input id="dfDate" type="date"><input id="dfTime" type="time"><button id="dfSuggest" class="btn btn-secondary">🤖 اقتراح</button><button id="dfSave" class="btn btn-primary">📅 حجز المتابعة</button><button id="dfAi" class="btn btn-secondary">🧠 AI Session</button></div><div id="dfState" class="muted" style="margin-top:10px"></div>`;
    host.appendChild(box);$('dfSuggest').onclick=suggest;$('dfSave').onclick=save;$('dfAi').onclick=()=>document.querySelector('#azaadClinicianAICockpit')?.scrollIntoView({behavior:'smooth',block:'start'})
  }
  const $=id=>document.getElementById(id);
  async function suggest(){try{$('dfDate').value=suggestedDate(14);$('dfState').textContent='🤖 '+(document.documentElement.lang||'').toLowerCase().startsWith('en'?'Suggested follow-up date: 14 days from today.':'تم اقتراح موعد متابعة بعد 14 يومًا من اليوم.')}catch(e){$('dfState').textContent='❌ '+e.message}}
  async function save(){const pid=patientId(),date=$('dfDate').value,time=$('dfTime').value;if(!pid)return $('dfState').textContent='❌ لم يتم تحديد المريض.';if(!date)return $('dfState').textContent='❌ حدد تاريخ المتابعة.';const doctorId=window.CURRENT_DOCTOR_ID||document.body.dataset.doctorId||'';const serviceId=window.CURRENT_SERVICE_ID||document.body.dataset.serviceId||'';const sourceBookingId=window.CURRENT_BOOKING_ID||document.body.dataset.bookingId||'';if(!doctorId||!serviceId)return $('dfState').textContent='❌ يجب أن تكون الزيارة مرتبطة بالطبيب والخدمة.';try{await api('followup-booking-create',{patient_id:pid,source_booking_id:sourceBookingId||null,appointment_date:date,appointment_time:time||'10:00',doctor_id:doctorId,service_id:serviceId,notes:'تم تحديد المتابعة من صفحة الطبيب.'});$('dfState').innerHTML='<strong style="color:#137333">📅 تم الحجز. ظهر الموعد للاستقبال والإدارة، وتم إنشاء تنبيه للموظفين.</strong>'}catch(e){$('dfState').textContent='❌ '+e.message}}
  function loadCockpit(){if(document.querySelector('script[data-azaad-ai-cockpit]'))return;const s=document.createElement('script');s.src='./clinician-ai-session-cockpit.js';s.async=true;s.dataset.azaadAiCockpit='true';document.head.appendChild(s)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{install();loadCockpit()}):(()=>{install();loadCockpit()})();
})();
