(() => {
  'use strict';
  const REST='https://derofsthjivlkcdnojww.supabase.co/rest/v1';
  const KEY='sb_publishable_GC253fvQbNBsDOaKjWGRw_tPYJrgLa';
  const $=id=>document.getElementById(id);
  const originalFetch=window.fetch.bind(window);
  async function auth(){const s=window.AZAAD?.state?.session;if(!s?.access_token)throw new Error('جلسة الطبيب غير موجودة أو منتهية.');return {apikey:KEY,Authorization:`Bearer ${s.access_token}`,Accept:'application/json','Content-Type':'application/json'}}
  async function api(path,options={}){const r=await originalFetch(`${REST}/${path}`,{...options,headers:{...(await auth()),...(options.headers||{})},cache:'no-store'});const t=await r.text();if(!r.ok)throw new Error(t||`HTTP ${r.status}`);return t?JSON.parse(t):null}
  function inject(){if($('doctorOperationalCenter'))return;const host=document.querySelector('#schedule');if(!host)return;const box=document.createElement('div');box.id='doctorOperationalCenter';box.className='card';box.innerHTML=`<h3 class="section-title">🧑‍⚕️ مركز التشغيل والطبيب</h3><div id="doctorOpsGrid" class="mini-grid"><div class="mini"><b>التحويلات</b><div id="doctorTransfers">—</div></div><div class="mini"><b>الحضور اليوم</b><div id="doctorAttendance">—</div></div><div class="mini"><b>التقويم</b><div id="doctorOpsClock">—</div></div></div>`;host.insertBefore(box,host.firstChild)}
  async function refresh(){inject();if(!$('doctorOperationalCenter'))return;try{const headers=await auth();const [tr,at]=await Promise.all([api('clinic_doctor_transfers?select=id,status,requested_by,reason,created_at,from_doctor_id,to_doctor_id&status=eq.pending&order=created_at.desc&limit=10'),api(`clinic_staff_attendance?select=status,clock_in_at,clock_out_at,break_start_at,break_end_at&work_date=eq.${new Date().toISOString().slice(0,10)}&limit=1`)]);$('doctorTransfers').textContent=tr?.length?`${tr.length} طلب تحويل يحتاج مراجعة`:'لا توجد طلبات تحويل';$('doctorAttendance').textContent=at?.[0]?.clock_in_at?`حضور ${new Date(at[0].clock_in_at).toLocaleTimeString()}`:'لم يسجل حضور اليوم';}catch(e){$('doctorTransfers').textContent='تعذر تحميل البيانات';$('doctorAttendance').textContent='تعذر تحميل الحضور'}}
  setInterval(()=>{const el=$('doctorOpsClock');if(el)el.textContent=new Date().toLocaleString('ar-EG')},1000);window.addEventListener('load',refresh);setTimeout(refresh,1200);
})();
