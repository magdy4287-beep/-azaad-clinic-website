/* AZAAD CLINIC — ADMIN ENHANCEMENTS V1
 * Free-only admin experience layer.
 * Loaded by patient-session-bridge-v3.js on admin.html.
 * Does not replace the existing admin controller; it augments it.
 */
(() => {
  'use strict';
  if (!/admin\.html$/i.test(location.pathname)) return;
  if (window.__AZAAD_ADMIN_ENHANCEMENTS__) return;
  window.__AZAAD_ADMIN_ENHANCEMENTS__ = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const token = () => window.AZAAD?.state?.session?.access_token || '';
  const URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const call = async (fn, params = {}) => {
    const u = new URL(`${URL}/functions/v1/${fn}`);
    Object.entries(params).forEach(([k,v]) => { if (v !== '' && v != null) u.searchParams.set(k, v); });
    const r = await fetch(u, { headers: { Authorization:`Bearer ${token()}`, apikey:KEY, Accept:'application/json' }, cache:'no-store' });
    let b = {}; try { b = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error(b?.error || b?.message || `HTTP ${r.status}`);
    return b;
  };
  const toast = (m, err=false) => window.AZAAD?.toast ? window.AZAAD.toast(m, err) : console[err?'error':'log'](m);

  const dict = {
    'لوحة إدارة العيادة':'Clinic Administration', 'تسجيل الدخول':'Sign in', 'اسم المستخدم':'Username', 'كلمة المرور':'Password',
    'الحجوزات':'Appointments', 'الأطباء':'Doctors', 'الخدمات':'Services', 'جداول الأطباء':'Doctor Schedules', 'المنشورات والعروض':'Posts & Offers',
    'العطلات والإغلاقات':'Holidays & Closures', 'ساعات العمل العامة':'General Working Hours', 'إدارة الموظفين':'Staff Management', 'إعدادات العيادة':'Clinic Settings',
    'حساب الإدارة':'Admin Account', 'تحديث':'Refresh', 'الموقع':'Website', 'تسجيل الخروج':'Logout', 'إجمالي الحجوزات':'Total Appointments',
    'قيد المراجعة':'Pending', 'مؤكدة':'Confirmed', 'حجوزات اليوم':'Today Appointments', 'كل الحالات':'All statuses', 'مؤكد':'Confirmed', 'ملغي':'Cancelled', 'مكتمل':'Completed',
    'إضافة طبيب':'Add Doctor', 'إضافة خدمة':'Add Service', 'اختر الطبيب':'Select doctor', 'منشور جديد':'New Post', 'إضافة إغلاق':'Add Closure', 'حفظ':'Save',
    'الموظفون':'Staff', 'الإعدادات':'Settings', 'حساب الإدارة':'Admin Account'
  };
  const ar = new Map(Object.entries(dict).map(([a,e]) => [e,a]));
  const translateText = root => {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    const nodes=[]; let n; while(n=walker.nextNode()) nodes.push(n);
    nodes.forEach(x => { const t=x.nodeValue.trim(); if(dict[t]) x.nodeValue=x.nodeValue.replace(t,dict[t]); else if(ar.has(t)) x.nodeValue=x.nodeValue.replace(t,ar.get(t)); });
    document.querySelectorAll('[placeholder]').forEach(el=>{ if(dict[el.placeholder]) el.placeholder=dict[el.placeholder]; else if(ar.has(el.placeholder)) el.placeholder=ar.get(el.placeholder); });
  };
  const setLang = lang => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    localStorage.setItem('azaad_admin_lang', lang);
    document.body.dataset.lang = lang;
    document.querySelectorAll('[data-ar][data-en]').forEach(el=>{ el.textContent = lang==='en' ? el.dataset.en : el.dataset.ar; });
    translateText(document.body);
    const b=$('azaadLangToggle'); if(b) b.textContent=lang==='en'?'عربي':'English';
  };
  const installLanguage = () => {
    const host=document.querySelector('.top-actions') || document.querySelector('.topbar'); if(!host || $('azaadLangToggle')) return;
    const b=document.createElement('button'); b.id='azaadLangToggle'; b.className='btn btn-secondary'; b.type='button'; b.textContent='English';
    b.onclick=()=>setLang(document.documentElement.lang==='en'?'ar':'en'); host.appendChild(b);
    const saved=localStorage.getItem('azaad_admin_lang') || 'ar';
    if(saved==='en') setLang('en');
  };

  const addPanel = (id,title,icon) => {
    if($(id)) return $(id);
    const sec=document.createElement('section'); sec.id=id; sec.className='panel'; sec.innerHTML=`<div class="card"><div class="panel-head"><h2>${icon} <span data-ar="${esc(title)}" data-en="${esc(dict[title]||title)}">${esc(title)}</span></h2><div id="${id}Actions" class="top-actions"></div></div><div id="${id}Body"></div></div>`;
    $('adminPage')?.appendChild(sec); return sec;
  };
  const addTab = (panelId,title,icon) => {
    const tabs=document.querySelector('.tabs'); if(!tabs || document.querySelector(`[data-panel="${panelId}"]`)) return;
    const b=document.createElement('button'); b.className='tab'; b.dataset.panel=panelId; b.type='button'; b.innerHTML=`${icon} <span data-ar="${esc(title)}" data-en="${esc(dict[title]||title)}">${esc(title)}</span>`;
    b.onclick=()=>activate(panelId); tabs.appendChild(b);
  };
  const activate = id => {
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.panel===id));
    document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===id));
    if(id==='patients360') patientSearch();
    if(id==='invoicesCenter') invoiceLoad();
    if(id==='managementCenter') managementLoad();
    if(id==='aiCenter') aiLoad();
  };
  const style = () => { if($('azaadEnhStyle')) return; const s=document.createElement('style'); s.id='azaadEnhStyle'; s.textContent=`
    .az-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.az-kpi{padding:15px;border:1px solid #e2e6ef;border-radius:12px;background:#fff}.az-kpi b{display:block;font-size:24px;margin-top:5px}.az-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.az-toolbar input,.az-toolbar select{max-width:240px}.az-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid #e2e6ef;border-radius:12px;padding:12px;margin:8px 0}.az-table{overflow:auto}.az-table table{min-width:900px}.az-alert{border-right:5px solid #b38a42;padding:12px;background:#fff9eb;border-radius:10px;margin:8px 0}.az-danger{border-right-color:#a32939}.az-ok{border-right-color:#167345}.az-muted{color:#6c758c}.az-chart{display:flex;align-items:flex-end;gap:8px;height:180px;padding:15px;border:1px solid #e2e6ef;border-radius:12px;background:#fafbfe}.az-bar{flex:1;background:#17214f;min-width:18px;border-radius:5px 5px 0 0;position:relative}.az-bar span{position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);font-size:10px;white-space:nowrap}.az-media{max-width:110px;max-height:80px;border-radius:8px;object-fit:cover}.az-progress{height:10px;background:#edf0f6;border-radius:20px;overflow:hidden}.az-progress i{display:block;height:100%;background:#17214f}.az-search-results{max-height:300px;overflow:auto}.az-click{cursor:pointer}.az-card{border:1px solid #e2e6ef;border-radius:12px;padding:14px}.az-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:900px){.az-grid{grid-template-columns:1fr 1fr}.az-two{grid-template-columns:1fr}}@media(max-width:550px){.az-grid{grid-template-columns:1fr}}
  `; document.head.appendChild(s); };

  const patientSearch = async () => {
    const body=$('patients360Body'); if(!body) return;
    if(!body.dataset.ready){ body.dataset.ready='1'; body.innerHTML=`<div class="az-toolbar"><input id="azPatientQ" placeholder="🔎 الاسم / الهاتف / MRN"><button id="azPatientFind" class="btn btn-primary">🔎 بحث</button><input id="azPatientDate" type="date"><button id="azPatientToday" class="btn btn-secondary">📅 اليوم</button></div><div id="azPatientResults" class="az-search-results"></div><div id="azPatientDetail"></div>`; $('azPatientFind').onclick=()=>patientSearch(); $('azPatientToday').onclick=()=>{ $('azPatientDate').value=new Date().toISOString().slice(0,10); patientSearch(); }; }
    const q=$('azPatientQ')?.value?.trim()||''; if(!q) return;
    const r=await call('azaad-patient-360',{q}); const out=$('azPatientResults'); out.innerHTML=(r.patients||[]).map(p=>`<div class="az-row az-click" data-patient="${esc(p.id)}"><b>🤢 ${esc(p.full_name)}</b><span>MRN: ${esc(p.mrn||'—')} • 📲 ${esc(p.phone||'—')}</span></div>`).join('') || '<div class="empty">📭 لا توجد نتائج.</div>';
    out.querySelectorAll('[data-patient]').forEach(x=>x.onclick=()=>patientDetail(x.dataset.patient));
  };
  const patientDetail = async id => {
    const d=$('azPatientDetail'); d.innerHTML='<div class="empty">⏳ جاري تحميل ملف المريض...</div>';
    try { const r=await call('azaad-patient-360',{patient_id:id}); const s=r.summary||{}; d.innerHTML=`<div class="az-grid"><div class="az-kpi">📅 الحجوزات<b>${s.booking_count||0}</b></div><div class="az-kpi">🩺 الزيارات<b>${s.visit_count||0}</b></div><div class="az-kpi">🧾 الفواتير<b>${s.invoice_count||0}</b></div><div class="az-kpi">💰 المتبقي<b>${Number(s.balance||0).toFixed(2)}</b></div></div><div class="az-two" style="margin-top:12px"><div class="az-card"><h3>📅 المواعيد</h3>${(r.bookings||[]).slice(0,20).map(x=>`<div class="az-row"><span>${esc(x.appointment_date||'—')} ${esc(String(x.appointment_time||'').slice(0,5))}</span><span>${esc(x.status||'—')}</span></div>`).join('')||'<div class="empty">لا توجد مواعيد.</div>'}</div><div class="az-card"><h3>🧾 الفواتير</h3>${(r.invoices||[]).slice(0,20).map(x=>`<div class="az-row"><span>${esc(x.invoice_number||x.id)}</span><b>${Number(x.total_amount||x.total||0).toFixed(2)}</b></div>`).join('')||'<div class="empty">لا توجد فواتير.</div>'}</div></div><div class="az-card" style="margin-top:12px"><h3>🧠 السجل السريري والتطور</h3>${(r.clinical_visits||[]).map(v=>`<div class="az-row"><div><b>${esc(v.visit_date||'—')}</b><div class="az-muted">${esc(v.assessment||v.clinical_notes||'')}</div></div><span>${v.patient_progress!=null?`📈 ${esc(v.patient_progress)}`:''}</span></div>`).join('')||'<div class="empty">لا توجد زيارات مسجلة.</div>'}</div><div class="az-card" style="margin-top:12px"><h3>🚨 التنبيهات</h3>${(r.alerts||[]).map(a=>`<div class="az-alert ${String(a.severity||'').toUpperCase()==='HIGH'?'az-danger':''}"><b>${esc(a.title||a.alert_type)}</b><div>${esc(a.message||'')}</div></div>`).join('')||'<div class="az-ok az-alert">✅ لا توجد تنبيهات مفتوحة.</div>'}</div>`; } catch(e){ d.innerHTML=`<div class="error">${esc(e.message)}</div>`; }
  };

  const invoiceLoad = async () => {
    const body=$('invoicesCenterBody'); if(!body) return;
    if(!body.dataset.ready){ body.dataset.ready='1'; body.innerHTML=`<div class="az-toolbar"><input id="azInvQ" placeholder="🔎 رقم الفاتورة / ملاحظات"><select id="azInvStatus"><option value="">كل الحالات</option><option value="paid">مدفوعة</option><option value="partial">جزئية</option><option value="unpaid">غير مدفوعة</option></select><input id="azInvFrom" type="date"><input id="azInvTo" type="date"><button id="azInvFind" class="btn btn-primary">🔎 بحث</button></div><div id="azInvSummary"></div><div id="azInvTable"></div>`; $('azInvFind').onclick=()=>invoiceLoad(); }
    const r=await call('azaad-invoice-center',{api:'invoices',q:$('azInvQ')?.value||'',status:$('azInvStatus')?.value||'',from:$('azInvFrom')?.value||'',to:$('azInvTo')?.value||'',limit:500}); const s=r.summary||{}; $('azInvSummary').innerHTML=`<div class="az-grid"><div class="az-kpi">🧾 الفواتير<b>${s.count||0}</b></div><div class="az-kpi">💵 الإجمالي<b>${Number(s.total||0).toFixed(2)}</b></div><div class="az-kpi">🟢 المحصل<b>${Number(s.paid||0).toFixed(2)}</b></div><div class="az-kpi">🔴 المتبقي<b>${Number(s.remaining||0).toFixed(2)}</b></div></div>`; $('azInvTable').innerHTML=`<div class="table-wrap az-table"><table><thead><tr><th>رقم</th><th>المريض</th><th>MRN</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead><tbody>${(r.invoices||[]).map(x=>`<tr><td>${esc(x.invoice_number||'—')}</td><td>${esc(x.clinic_patients?.patient_name||x.patient_name||'—')}</td><td>${esc(x.clinic_patients?.mrn||'—')}</td><td>${esc((x.created_at||'').slice(0,10))}</td><td>${Number(x.total_amount||0).toFixed(2)}</td><td>${Number(x.paid_amount||0).toFixed(2)}</td><td>${Number(x.remaining_amount||0).toFixed(2)}</td><td>${esc(x.status||'—')}</td></tr>`).join('')}</tbody></table></div>`;
  };

  const managementLoad = async () => {
    const body=$('managementCenterBody'); if(!body) return;
    if(!body.dataset.ready){ body.dataset.ready='1'; body.innerHTML=`<div class="az-toolbar"><input id="azMgmtFrom" type="date"><input id="azMgmtTo" type="date"><button id="azMgmtFind" class="btn btn-primary">📊 تحديث التقرير</button></div><div id="azMgmt"></div>`; $('azMgmtFind').onclick=managementLoad; }
    const from=$('azMgmtFrom').value||new Date().toISOString().slice(0,10), to=$('azMgmtTo').value||from; const r=await call('azaad-management-dashboard',{from,to}); const k=r.kpis||{}; const max=Math.max(...(r.doctor_performance||[]).map(x=>x.total_bookings),1); $('azMgmt').innerHTML=`<div class="az-grid"><div class="az-kpi">📅 الحجوزات<b>${k.bookings||0}</b></div><div class="az-kpi">✅ الإنجاز<b>${k.completion_rate||0}%</b></div><div class="az-kpi">💰 المحصل<b>${Number(k.collected||0).toFixed(2)}</b></div><div class="az-kpi">📈 صافي التدفق<b>${Number(k.net_cash_flow||0).toFixed(2)}</b></div><div class="az-kpi">🧾 مستحق<b>${Number(k.outstanding||0).toFixed(2)}</b></div><div class="az-kpi">👥 الموظفون<b>${k.active_staff||0}</b></div><div class="az-kpi">🚨 التنبيهات<b>${k.open_alerts||0}</b></div><div class="az-kpi">🔁 المتابعات<b>${k.open_followups||0}</b></div></div><div class="az-card" style="margin-top:12px"><h3>🧑‍⚕️ أداء الأطباء</h3>${(r.doctor_performance||[]).map(d=>`<div class="az-row"><div style="min-width:180px"><b>${esc(d.doctor_name||'—')}</b><div class="az-muted">${d.total_bookings} appointments • ${d.completed} completed • ${d.no_show} no-show</div></div><div style="flex:1;min-width:180px"><div class="az-progress"><i style="width:${Math.min(100,(d.total_bookings/max)*100)}%"></i></div></div><strong>${d.completion_rate}%</strong></div>`).join('')||'<div class="empty">لا توجد بيانات.</div>'}</div>`;
  };

  const aiLoad = async () => {
    const body=$('aiCenterBody'); if(!body) return;
    if(!body.dataset.ready){ body.dataset.ready='1'; body.innerHTML=`<div class="az-toolbar"><input id="azAiFrom" type="date"><input id="azAiTo" type="date"><button id="azAiRun" class="btn btn-gold">🤖 تحليل مجاني</button></div><div id="azAiOut"></div>`; $('azAiRun').onclick=aiLoad; }
    try { const from=$('azAiFrom').value||new Date().toISOString().slice(0,10), to=$('azAiTo').value||from; const r=await call('azaad-ai-insights',{from,to}); const k=r.kpis||{}; $('azAiOut').innerHTML=`<div class="az-grid"><div class="az-kpi">📅 حجوزات<b>${k.bookings||0}</b></div><div class="az-kpi">🚫 No-show<b>${k.no_show_rate||0}%</b></div><div class="az-kpi">💰 تحصيل<b>${Number(k.collected||0).toFixed(2)}</b></div><div class="az-kpi">🧾 مستحق<b>${Number(k.outstanding||0).toFixed(2)}</b></div></div>${(r.insights||[]).map(x=>`<div class="az-alert ${x.severity==='HIGH'?'az-danger':''}"><b>🤖 ${esc(x.title_ar||x.title_en)}</b><div>${esc(document.documentElement.lang==='en'?x.recommendation_en:x.recommendation_ar)}</div></div>`).join('')}`; } catch(e){ $('azAiOut').innerHTML=`<div class="error">${esc(e.message)}</div>`; }
  };

  const enhanceDoctorsServices = () => {
    const dl=$('doctorList'); if(dl && !dl.dataset.enhanced){ dl.dataset.enhanced='1'; const obs=new MutationObserver(()=>dl.querySelectorAll('[data-edit-doctor]').forEach(b=>{ const id=b.dataset.editDoctor; if(b.parentElement && !b.parentElement.querySelector(`[data-delete-doctor="${id}"]`)){ const x=document.createElement('button'); x.className='btn btn-danger'; x.type='button'; x.dataset.deleteDoctor=id; x.textContent='🗑️ حذف'; x.onclick=async()=>{ if(!confirm('حذف/إخفاء الطبيب من النظام؟'))return; try{ await window.AZAAD.supabase.auth.getSession(); const s=token(); const r=await fetch(`${URL}/functions/v1/azaad-admin?api=doctor&id=${encodeURIComponent(id)}`,{method:'DELETE',headers:{Authorization:`Bearer ${s}`,apikey:KEY}}); if(!r.ok)throw new Error((await r.json()).error||'فشل الحذف'); await window.AZAAD.refresh(); toast('✅ تم حذف الطبيب.'); }catch(e){toast(e.message,true);} }; b.parentElement.appendChild(x); })); dl.querySelectorAll('[data-edit-doctor]').forEach(b=>{}); obs.observe(dl,{childList:true,subtree:true}); }
    const sl=$('serviceList'); if(sl && !sl.dataset.enhanced){ sl.dataset.enhanced='1'; const obs=new MutationObserver(()=>sl.querySelectorAll('[data-edit-service]').forEach(b=>{const id=b.dataset.editService;if(b.parentElement&&!b.parentElement.querySelector(`[data-delete-service="${id}"]`)){const x=document.createElement('button');x.className='btn btn-danger';x.type='button';x.dataset.deleteService=id;x.textContent='🗑️ حذف';x.onclick=async()=>{if(!confirm('حذف/إخفاء الخدمة؟'))return;try{const s=token();const r=await fetch(`${URL}/functions/v1/azaad-admin?api=service&id=${encodeURIComponent(id)}`,{method:'DELETE',headers:{Authorization:`Bearer ${s}`,apikey:KEY}});if(!r.ok)throw new Error((await r.json()).error||'فشل الحذف');await window.AZAAD.refresh();toast('✅ تم حذف الخدمة.');}catch(e){toast(e.message,true);}};b.parentElement.appendChild(x);}}));obs.observe(sl,{childList:true,subtree:true}); }
  };

  const boot = () => {
    if(!$('adminPage')) return setTimeout(boot,400);
    style(); installLanguage();
    addPanel('patients360','ملف المريض 360°','🤢'); addTab('patients360','ملف المريض 360°','🤢');
    addPanel('invoicesCenter','الفواتير و RCM','🧾'); addTab('invoicesCenter','الفواتير و RCM','🧾');
    addPanel('managementCenter','الرسوم والتقارير','📊'); addTab('managementCenter','الرسوم والتقارير','📊');
    addPanel('aiCenter','مركز الذكاء الاصطناعي','🤖'); addTab('aiCenter','مركز الذكاء الاصطناعي','🤖');
    enhanceDoctorsServices();
    document.querySelectorAll('.tab').forEach(t=>{ if(!t.dataset.azBound){t.dataset.azBound='1'; const old=t.onclick; t.onclick=e=>{ if(old) old.call(t,e); activate(t.dataset.panel); }; }});
    setTimeout(enhanceDoctorsServices,1000); setTimeout(enhanceDoctorsServices,3000);
    const lang=localStorage.getItem('azaad_admin_lang'); if(lang==='en') setLang('en');
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
