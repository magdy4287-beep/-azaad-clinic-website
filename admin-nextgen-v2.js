/* AZAAD CLINIC — ADMIN NEXT-GEN V2
 * Additive reliability layer: unified i18n, date-aware booking search,
 * universal reception search, and per-phone search actions.
 * No reload, no sign-out, no service-role key.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const PATIENTS_API = `${SUPABASE_URL}/functions/v1/azaad-patients`;
  const APPOINTMENTS_API = `${SUPABASE_URL}/functions/v1/azaad-appointments-center`;
  const LANG_KEY = 'azaadClinicLanguage';
  const ADMIN_LANG_KEY = 'azaad_admin_lang';
  const state = { lang: 'ar', textSource: new WeakMap(), request: 0, installed: false };

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const norm = v => String(v ?? '').replace(/\s+/g, ' ').trim();
  const tr = (ar, en) => state.lang === 'en' ? en : ar;
  const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const isAdmin = () => !!document.querySelector('.admin') || /admin\.html$/i.test(location.pathname);
  const token = () => window.AZAAD?.state?.session?.access_token || '';

  function mrn(v){
    const x=norm(v).toUpperCase();
    if(/^AZA-\d{6}$/.test(x))return x;
    if(/^AZA\d{6}$/.test(x))return `AZA-${x.slice(3)}`;
    if(/^\d{1,6}$/.test(x))return `AZA-${x.padStart(6,'0')}`;
    return '';
  }
  function displayMrn(v){const x=mrn(v);return x?`Patient ${x.slice(4)}`:(v||'—');}
  function lang(){try{const a=localStorage.getItem(ADMIN_LANG_KEY);if(a==='ar'||a==='en')return a;const b=localStorage.getItem(LANG_KEY);if(b==='ar'||b==='en')return b;}catch(_){}return String(document.documentElement.lang||'ar').toLowerCase().startsWith('en')?'en':'ar';}
  function dict(){return {...(window.AZAAD_I18N?.dictionary||{}),...(window.AZAAD_ADMIN_ENGLISH_HARDENING?.map||{})};}
  function reverse(d){const r=new Map();Object.entries(d).forEach(([ar,en])=>{if(!r.has(norm(en)))r.set(norm(en),ar);});return r;}
  function translate(source, d, r){
    let x=String(source||'');
    if(state.lang==='ar'){
      [...r.entries()].sort((a,b)=>b[0].length-a[0].length).forEach(([en,ar])=>{if(en&&x.includes(en))x=x.split(en).join(ar);});
      return x;
    }
    Object.keys(d).sort((a,b)=>b.length-a.length).forEach(ar=>{if(ar&&x.includes(ar))x=x.split(ar).join(d[ar]);});
    return x;
  }
  function applyLanguage(){
    const d=dict(),r=reverse(d);
    document.documentElement.lang=state.lang;
    document.documentElement.dir=state.lang==='en'?'ltr':'rtl';
    document.title=state.lang==='en'?'Azaad Clinic | Administration':'Azaad Clinic | لوحة الإدارة';
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
    while(w.nextNode())nodes.push(w.currentNode);
    nodes.forEach(n=>{
      const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|NOSCRIPT)$/i.test(p.tagName)||p.closest('textarea,input,select,[data-no-i18n]'))return;
      let source=state.textSource.get(n);
      if(source==null){const current=String(n.nodeValue);source=r.get(norm(current))||current;state.textSource.set(n,source);}
      const next=translate(source,d,r);if(next!==n.nodeValue)n.nodeValue=next;
    });
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>['placeholder','title','aria-label'].forEach(a=>{
      const cur=el.getAttribute(a);if(!cur)return;const key=`azaadSrc${a}`;if(!el.dataset[key])el.dataset[key]=r.get(norm(cur))||cur;el.setAttribute(a,translate(el.dataset[key],d,r));
    }));
    document.querySelectorAll('option').forEach(o=>{if(!o.dataset.azaadSrc)o.dataset.azaadSrc=r.get(norm(o.textContent))||o.textContent;o.textContent=translate(o.dataset.azaadSrc,d,r);});
    if(state.lang==='en')window.AZAAD_ADMIN_ENGLISH_HARDENING?.run?.();
    updateLangButtons();
  }
  function updateLangButtons(){const h=$('azaadUnifiedLanguageSwitch');if(!h)return;h.querySelectorAll('[data-lang]').forEach(b=>{const on=b.dataset.lang===state.lang;b.style.background=on?'#17214f':'#fff';b.style.color=on?'#fff':'#17214f';});}
  function installLanguage(){
    const top=document.querySelector('.topbar');if(!top||$('azaadUnifiedLanguageSwitch'))return;
    const s=document.createElement('style');s.id='azaadUnifiedLanguageStyle';s.textContent='#azLang,#azaadCentralLanguageSwitch{display:none!important}#azaadUnifiedLanguageSwitch{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-inline-start:auto}#azaadUnifiedLanguageSwitch button{border:1px solid #d9deea;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer;min-width:92px}';document.head.appendChild(s);
    const h=document.createElement('div');h.id='azaadUnifiedLanguageSwitch';h.innerHTML='<button type="button" data-lang="ar">🇪🇬 العربية</button><button type="button" data-lang="en">🇬🇧 English</button>';
    h.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{state.lang=b.dataset.lang==='en'?'en':'ar';try{localStorage.setItem(LANG_KEY,state.lang);localStorage.setItem(ADMIN_LANG_KEY,state.lang);}catch(_){}applyLanguage();window.dispatchEvent(new CustomEvent('azaadLanguageChanged',{detail:{language:state.lang}}));});
    top.querySelector('.top-actions')?.prepend(h);updateLangButtons();
  }
  async function api(url){const t=token();if(!t)throw Error(tr('جلسة الإدارة غير موجودة أو منتهية.','The admin session is missing or expired.'));const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json',Authorization:`Bearer ${t}`,apikey:KEY}});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b?.error||b?.message||`HTTP ${r.status}`);return b;}
  function status(s){const n=String(s||'').toLowerCase().replaceAll('-','_');const m={pending:['🟡 قيد المراجعة','🟡 Pending'],confirmed:['🟢 مؤكد','🟢 Confirmed'],cancelled:['❌ ملغي','❌ Cancelled'],completed:['✅ مكتمل','✅ Completed'],no_show:['🔴 لم يحضر','🔴 No-show'],rescheduled:['🔄 أعيدت الجدولة','🔄 Rescheduled']};const x=m[n]||[s||'—',s||'—'];return `<span class="badge ${n==='confirmed'?'confirmed':n==='cancelled'?'cancelled':n==='completed'?'completed':'pending'}">${esc(tr(x[0],x[1]))}</span>`;}
  function openPatient(id){if(!id)return;document.querySelector('[data-panel="patientsPanel"]')?.click();const fn=window.AZAAD_PATIENTS_CENTER?.open360;if(typeof fn==='function')fn(id);}
  function addPhoneSearch(parent,phone){if(!parent||!phone||parent.querySelector('.azaad-phone-search'))return;const b=document.createElement('button');b.type='button';b.className='btn btn-secondary azaad-phone-search';b.textContent=`🔎 ${tr('بحث','Search')}`;b.title=tr('البحث بهذا الرقم في ملفات المرضى والحجوزات','Search this phone in patient files and bookings');b.onclick=()=>{const i=$('patientSearchInput')||$('fdUniversalSearch')||$('search');if(i){i.value=phone;i.dispatchEvent(new Event('input',{bubbles:true}));i.focus();}document.querySelector('[data-panel="patientsPanel"]')?.click();};parent.appendChild(b);}
  function patientCards(){const root=$('patientsPanel');if(!root)return;root.querySelectorAll('.patient-card').forEach(card=>{const phone=norm(card.querySelector('.patient-meta [dir="ltr"]')?.textContent||'');addPhoneSearch(card.querySelector('.patient-actions'),phone);});}
  function bookingsUI(){
    const p=$('bookings'),filters=p?.querySelector('.filters'),table=$('bookingTable');if(!p||!filters||!table||p.dataset.nextgen)return;p.dataset.nextgen='1';
    const box=document.createElement('div');box.className='azaad-booking-nextgen';box.style.cssText='display:grid;grid-template-columns:minmax(180px,1fr) auto auto;gap:10px;align-items:end;margin:12px 0';box.innerHTML=`<label>${tr('تاريخ الحجوزات','Booking date')}<input id="azaadBookingDate" type="date" value="${today()}"></label><button id="azaadBookingToday" class="btn btn-secondary" type="button">📅 ${tr('اليوم','Today')}</button><button id="azaadBookingSearch" class="btn btn-primary" type="button">🔎 ${tr('بحث','Search')}</button>`;filters.insertAdjacentElement('afterend',box);
    const info=document.createElement('div');info.id='azaadBookingInfo';info.className='muted';table.insertAdjacentElement('beforebegin',info);
    $('azaadBookingDate').onchange=loadBookingsDay;$('azaadBookingToday').onclick=()=>{$('azaadBookingDate').value=today();loadBookingsDay()};$('azaadBookingSearch').onclick=loadBookingsDay;$('search')?.addEventListener('keydown',e=>{if(e.key==='Enter')loadBookingsDay()});$('statusFilter')?.addEventListener('change',loadBookingsDay);loadBookingsDay();
  }
  async function loadBookingsDay(){
    const table=$('bookingTable'),d=$('azaadBookingDate')?.value||today(),q=norm($('search')?.value||''),st=String($('statusFilter')?.value||'');if(!table)return;const id=++state.request;table.innerHTML=`<div class="empty">⏳ ${tr('جاري تحميل المواعيد...','Loading appointments...')}</div>`;
    try{const p=new URLSearchParams({from:d,to:d,limit:'500'}),m=mrn(q);if(m)p.set('mrn',m);else if(q)p.set('q',q);let rows=(await api(`${APPOINTMENTS_API}?${p}`)).appointments||[];if(st)rows=rows.filter(x=>String(x.status||'').toLowerCase().replaceAll('-','_')===st);if(id!==state.request)return;const info=$('azaadBookingInfo');if(info)info.textContent=`📅 ${tr('الحجوزات في','Bookings for')} ${d} — ${rows.length}`;if(!rows.length){table.innerHTML=`<div class="empty">📭 ${tr('لا توجد حجوزات مطابقة.','No matching bookings.')}</div>`;return;}table.innerHTML=`<div class="table-wrap"><table><thead><tr><th>${tr('الوقت','Time')}</th><th>${tr('المريض','Patient')}</th><th>MRN</th><th>${tr('الهاتف','Phone')}</th><th>${tr('رقم الحجز','Booking')}</th><th>${tr('الطبيب','Doctor')}</th><th>${tr('الخدمة','Service')}</th><th>${tr('الحالة','Status')}</th><th>${tr('الملف','File')}</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(String(x.appointment_time||'').slice(0,5)||'—')}</td><td><b>${esc(x.clinic_patients?.full_name||x.patient_name||'—')}</b></td><td dir="ltr">${esc(x.clinic_patients?.mrn||x.mrn||x.patient_mrn||'—')}</td><td dir="ltr">${esc(x.clinic_patients?.phone||x.patient_phone||'—')}</td><td dir="ltr"><b>${esc(x.booking_code||'—')}</b></td><td>${esc(x.clinic_doctors?.full_name||x.doctor_name||'—')}</td><td>${esc(x.clinic_services?.name||x.service_name||'—')}</td><td>${status(x.status)}</td><td><button class="btn btn-secondary" type="button" data-azaad-open="${esc(x.patient_id||x.clinic_patients?.id||'')}">👤 ${tr('فتح','Open')}</button></td></tr>`).join('')}</tbody></table></div>`;table.querySelectorAll('[data-azaad-open]').forEach(b=>b.onclick=()=>openPatient(b.dataset.azaadOpen));}
    catch(e){if(id!==state.request)return;table.innerHTML=`<div class="error">❌ ${esc(e.message)}</div>`;}
  }
  function receptionUI(){
    const p=$('frontdeskPanel');if(!p||p.dataset.nextgen)return;p.dataset.nextgen='1';const first=p.querySelector('.fd-grid');if(first){const box=document.createElement('div');box.className='fd-grid';box.innerHTML=`<input id="fdUniversalSearch" type="search" placeholder="🔎 ${tr('الاسم / الموبايل / MRN / رقم الحجز','Name / Phone / MRN / Booking Number')}"><input id="fdUniversalDate" type="date" value="${today()}"><button id="fdUniversalSearchBtn" class="btn btn-secondary" type="button">🔎 ${tr('بحث شامل','Universal Search')}</button>`;first.insertAdjacentElement('afterend',box);$('fdUniversalSearchBtn').onclick=universalReception;$('fdUniversalSearch').onkeydown=e=>{if(e.key==='Enter')universalReception();};}
    const obs=new MutationObserver(()=>p.querySelectorAll('.fd-match').forEach(m=>{const phone=norm(m.textContent).match(/(?:📱|Phone|الهاتف)\s*([^·]+)/i)?.[1]?.trim()||'';addPhoneSearch(m,phone);}));obs.observe(p,{childList:true,subtree:true});
  }
  async function universalReception(){
    const q=norm($('fdUniversalSearch')?.value||''),d=$('fdUniversalDate')?.value||today();let out=$('fdUniversalResults');if(!out){out=document.createElement('div');out.id='fdUniversalResults';$('fdUniversalSearchBtn')?.closest('.fd-grid')?.insertAdjacentElement('afterend',out);}out.innerHTML=`<div class="empty">⏳ ${tr('جاري البحث...','Searching...')}</div>`;
    try{const m=mrn(q),pr=await api(`${PATIENTS_API}?api=patients&search=${encodeURIComponent(m||q)}`),pp=Array.isArray(pr.patients)?pr.patients:[],bp=new URLSearchParams({from:d,to:d,limit:'500'});if(m)bp.set('mrn',m);else if(q)bp.set('q',q);const br=await api(`${APPOINTMENTS_API}?${bp}`),bb=Array.isArray(br.appointments)?br.appointments:[];const patientHtml=pp.length?pp.slice(0,20).map(x=>`<div class="item"><div><b>${esc(x.patient_name||'—')}</b><div class="muted">🆔 ${esc(displayMrn(x.mrn))} · 📱 ${esc(x.patient_phone||'—')}</div></div><button class="btn btn-primary" data-fd-open="${esc(x.id)}">👤 ${tr('فتح الملف','Open Patient')}</button></div>`).join(''):`<div class="empty">📭 ${tr('لا توجد ملفات مطابقة.','No matching patient files.')}</div>`;const bookingHtml=bb.length?bb.slice(0,50).map(x=>`<div class="item"><div><b>${esc(x.patient_name||x.clinic_patients?.full_name||'—')}</b><div class="muted">⏰ ${esc(String(x.appointment_time||'').slice(0,5))} · 🆔 ${esc(displayMrn(x.mrn||x.patient_mrn||x.clinic_patients?.mrn))} · 🔖 ${esc(x.booking_code||'—')}</div></div>${status(x.status)}</div>`).join(''):`<div class="empty">📭 ${tr('لا توجد حجوزات مطابقة في هذا التاريخ.','No matching bookings for this date.')}</div>`;out.innerHTML=`<div class="card"><div class="panel-head"><h3>🔎 ${tr('نتائج البحث الشامل','Universal Search Results')}</h3><span class="muted">${esc(d)}</span></div><h4>👤 ${tr('ملفات المرضى','Patient files')}</h4>${patientHtml}<h4 style="margin-top:14px">📅 ${tr('حجوزات التاريخ','Date bookings')}</h4>${bookingHtml}</div>`;out.querySelectorAll('[data-fd-open]').forEach(b=>b.onclick=()=>openPatient(b.dataset.fdOpen));}
    catch(e){out.innerHTML=`<div class="error">❌ ${esc(e.message)}</div>`;}
  }
  function css(){if($('azaadNextGenStyle'))return;const s=document.createElement('style');s.id='azaadNextGenStyle';s.textContent='@media(max-width:800px){.azaad-booking-nextgen{grid-template-columns:1fr!important}}.azaad-phone-search{margin-inline-start:6px}';document.head.appendChild(s);}
  function install(){if(!isAdmin()||state.installed)return;state.installed=true;state.lang=lang();css();installLanguage();bookingsUI();receptionUI();patientCards();applyLanguage();const o=new MutationObserver(()=>{if(lang()!==state.lang){state.lang=lang();applyLanguage();}installLanguage();patientCards();});o.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,400),{once:true});else setTimeout(install,400);
})();
