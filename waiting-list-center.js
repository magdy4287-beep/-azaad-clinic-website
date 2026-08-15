/* AZAAD CLINIC - CENTRAL WAITING LIST CENTER
 * Free-first UI slice backed by clinic_waiting_list + RLS.
 * Scheduling truth remains in clinic_bookings; this module never creates
 * appointments directly from the browser.
 */
(()=>{
  const S=()=>window.AZAAD?.state||{};
  const D=()=>window.AZAAD?.supabase;
  const E=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const toast=(m,err=false)=>{const x=document.getElementById('toast');if(!x)return;x.textContent=m;x.style.background=err?'#a32939':'#17214f';x.classList.add('show');setTimeout(()=>x.classList.remove('show'),3200)};
  const role=()=>String(S().staff?.role||'').toUpperCase();
  const isDoctor=()=>role()==='DOCTOR';
  const doctorId=()=>S().staff?.doctor_id||null;
  const today=()=>new Date().toISOString().slice(0,10);
  const statusLabel={pending:'⏳ Pending',contacted:'📞 Contacted',confirmed:'🟢 Confirmed',converted:'📅 Converted',cancelled:'🔴 Cancelled',expired:'⌛ Expired',no_show:'🟠 No-show'};
  const priorityLabel={normal:'Normal',urgent:'⚠️ Urgent',emergency:'🚨 Emergency'};

  function addTab(){
    const tabs=document.querySelector('.tabs');
    if(!tabs||document.getElementById('waiting-list'))return;
    const b=document.createElement('button');
    b.className='tab'; b.type='button'; b.dataset.panel='waiting-list'; b.textContent='⏳ Waiting List';
    b.onclick=()=>open(); tabs.append(b);
  }

  function addPanel(){
    if(document.getElementById('waiting-list'))return;
    const s=document.createElement('section');
    s.id='waiting-list'; s.className='panel';
    s.innerHTML=`<div class="card">
      <div class="panel-head"><div><h2>⏳ Waiting List</h2><div class="muted">قائمة انتظار مركزية مرتبطة بالمريض والطبيب والخدمة.</div></div><button id="wlRefresh" class="btn btn-secondary" type="button">🔄 تحديث</button></div>
      <div class="grid">
        <label>📅 التاريخ المطلوب<input id="wlDate" type="date" value="${today()}"></label>
        <label>🧑‍⚕️ الطبيب<select id="wlDoctor"><option value="">اختر الطبيب</option></select></label>
        <label>🚦 الأولوية<select id="wlPriority"><option value="normal">Normal</option><option value="urgent">⚠️ Urgent</option><option value="emergency">🚨 Emergency</option></select></label>
        <label>🔎 بحث المريض<input id="wlPatientSearch" placeholder="الاسم / MRN / الهاتف" autocomplete="off"></label>
        <div id="wlPatientResults" class="full"></div>
        <label class="full">📝 سبب الانتظار<textarea id="wlReason" rows="2" placeholder="سبب طلب الموعد أو الانتظار"></textarea></label>
        <label class="full">📌 ملاحظات<textarea id="wlNotes" rows="2" placeholder="ملاحظات داخلية"></textarea></label>
      </div>
      <div class="modal-actions"><button id="wlAdd" class="btn btn-primary" type="button">⏳ إضافة إلى قائمة الانتظار</button></div>
      <div id="wlList" class="items" style="margin-top:18px"></div>
    </div>`;
    document.querySelector('.admin')?.append(s);
    document.getElementById('wlRefresh').onclick=load;
    document.getElementById('wlDate').onchange=load;
    document.getElementById('wlDoctor').onchange=load;
    document.getElementById('wlPatientSearch').oninput=searchPatients;
    document.getElementById('wlAdd').onclick=add;
  }

  async function doctors(){
    const s=document.getElementById('wlDoctor'); if(!s)return;
    const q=await D().from('clinic_doctors').select('id,name,title,image_url').eq('active',true).order('sort_order').order('name');
    if(q.error){toast(q.error.message,true);return}
    s.innerHTML='<option value="">اختر الطبيب</option>'+(q.data||[]).map(d=>`<option value="${d.id}">${E(d.name)}${d.title?` — ${E(d.title)}`:''}</option>`).join('');
    if(isDoctor()&&doctorId()){s.value=doctorId();s.disabled=true}
  }

  let selectedPatient=null;
  async function searchPatients(){
    const q=String(document.getElementById('wlPatientSearch')?.value||'').trim();
    const out=document.getElementById('wlPatientResults');
    if(!out)return;
    selectedPatient=null;
    if(q.length<2){out.innerHTML='';return}
    const [n,m,p]=await Promise.all([
      D().from('clinic_patients').select('id,mrn,patient_name,patient_phone').ilike('patient_name',`%${q}%`).limit(8),
      D().from('clinic_patients').select('id,mrn,patient_name,patient_phone').ilike('mrn',`%${q}%`).limit(8),
      D().from('clinic_patients').select('id,mrn,patient_name,patient_phone').ilike('patient_phone',`%${q}%`).limit(8)
    ]);
    const map=new Map();[...(n.data||[]),...(m.data||[]),...(p.data||[])].forEach(x=>map.set(x.id,x));
    const rows=[...map.values()];
    out.innerHTML=rows.length?rows.map(x=>`<button type="button" class="btn btn-secondary" data-wl-patient="${x.id}" style="display:block;width:100%;text-align:right;margin-bottom:7px">👤 <b>${E(x.patient_name)}</b> — ${E(x.mrn)} — ${E(x.patient_phone)}</button>`).join(''):'<div class="empty">لا توجد نتائج.</div>';
    out.querySelectorAll('[data-wl-patient]').forEach(b=>b.onclick=()=>{selectedPatient=rows.find(x=>x.id===b.dataset.wlPatient)||null;document.getElementById('wlPatientSearch').value=selectedPatient?`${selectedPatient.patient_name} — ${selectedPatient.mrn}`:'';out.innerHTML=selectedPatient?`<div class="item"><div>👤 <b>${E(selectedPatient.patient_name)}</b><div class="muted">${E(selectedPatient.mrn)} • ${E(selectedPatient.patient_phone)}</div></div><button id="wlClearPatient" class="btn btn-secondary" type="button">تغيير</button></div>`:'';document.getElementById('wlClearPatient')?.addEventListener('click',()=>{selectedPatient=null;document.getElementById('wlPatientSearch').value='';out.innerHTML=''})});
  }

  async function load(){
    const out=document.getElementById('wlList');if(!out||!D())return;
    const date=document.getElementById('wlDate')?.value||today();
    const d=document.getElementById('wlDoctor')?.value||null;
    let q=D().from('clinic_waiting_list').select('id,patient_id,doctor_id,service_id,requested_date,preferred_start_time,preferred_end_time,priority,status,position,reason,patient_phone_snapshot,source,notes,created_at,contacted_at,confirmed_at').eq('requested_date',date).order('position').order('created_at');
    if(d)q=q.eq('doctor_id',d);
    const r=await q;
    if(r.error){out.innerHTML=`<div class="error">${E(r.error.message)}</div>`;return}
    const rows=r.data||[];
    if(!rows.length){out.innerHTML='<div class="empty">⏳ لا يوجد مرضى في قائمة الانتظار لهذا اليوم.</div>';return}
    const ids=[...new Set(rows.map(x=>x.patient_id).filter(Boolean))];
    const dids=[...new Set(rows.map(x=>x.doctor_id).filter(Boolean))];
    const [ps,ds]=await Promise.all([
      ids.length?D().from('clinic_patients').select('id,mrn,patient_name,patient_phone').in('id',ids):{data:[]},
      dids.length?D().from('clinic_doctors').select('id,name,title').in('id',dids):{data:[]}
    ]);
    const pm=new Map((ps.data||[]).map(x=>[x.id,x])),dm=new Map((ds.data||[]).map(x=>[x.id,x]));
    out.innerHTML=rows.map(x=>{const p=pm.get(x.patient_id)||{},d=dm.get(x.doctor_id)||{};return `<div class="item"><div><b>⏳ #${x.position} — ${E(p.patient_name||'Patient')}</b><div class="muted">${E(p.mrn||'')} • ${E(p.patient_phone||x.patient_phone_snapshot||'')} • ${E(d.name||'Any doctor')}</div><div style="margin-top:6px">${statusLabel[x.status]||E(x.status)} • ${priorityLabel[x.priority]||E(x.priority)}</div>${x.reason?`<div class="muted" style="margin-top:5px">${E(x.reason)}</div>`:''}</div><div class="item-actions">${x.status==='pending'?`<button class="btn btn-secondary" data-wl-contact="${x.id}">📞 Contacted</button><button class="btn btn-danger" data-wl-cancel="${x.id}">🔴 Cancel</button>`:''}</div></div>`}).join('');
    out.querySelectorAll('[data-wl-contact]').forEach(b=>b.onclick=()=>setStatus(b.dataset.wlContact,'contacted'));
    out.querySelectorAll('[data-wl-cancel]').forEach(b=>b.onclick=()=>setStatus(b.dataset.wlCancel,'cancelled'));
  }

  async function add(){
    if(!selectedPatient){toast('اختر المريض أولًا.',true);return}
    const d=document.getElementById('wlDoctor')?.value||null;
    if(!d){toast('اختر الطبيب المطلوب.',true);return}
    const date=document.getElementById('wlDate')?.value||today();
    const active=await D().from('clinic_waiting_list').select('position').eq('doctor_id',d).eq('requested_date',date).in('status',['pending','contacted']).order('position',{ascending:false}).limit(1).maybeSingle();
    const position=Number(active.data?.position||0)+1;
    const payload={patient_id:selectedPatient.id,doctor_id:d,preferred_doctor_id:d,requested_date:date,priority:document.getElementById('wlPriority')?.value||'normal',reason:document.getElementById('wlReason')?.value.trim()||null,notes:document.getElementById('wlNotes')?.value.trim()||null,patient_phone_snapshot:selectedPatient.patient_phone,position,source:isDoctor()?'doctor':'frontdesk'};
    const r=await D().from('clinic_waiting_list').insert(payload);
    if(r.error){toast(r.error.message,true);return}
    toast('✅ تمت إضافة المريض إلى قائمة الانتظار');selectedPatient=null;document.getElementById('wlPatientSearch').value='';document.getElementById('wlPatientResults').innerHTML='';document.getElementById('wlReason').value='';document.getElementById('wlNotes').value='';await load();
  }

  async function setStatus(id,status){
    const patch={status};if(status==='contacted')patch.contacted_at=new Date().toISOString();
    const r=await D().from('clinic_waiting_list').update(patch).eq('id',id);
    if(r.error){toast(r.error.message,true);return}toast('✅ تم تحديث حالة الانتظار');await load();
  }

  function open(){
    document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active'));
    document.querySelector('[data-panel="waiting-list"]')?.classList.add('active');
    document.getElementById('waiting-list')?.classList.add('active');
    load();
  }

  function boot(){addTab();addPanel();doctors();load()}
  const wait=setInterval(()=>{if(window.AZAAD?.supabase&&document.querySelector('.tabs')){clearInterval(wait);boot()}},250);
  setTimeout(()=>clearInterval(wait),15000);
})();
