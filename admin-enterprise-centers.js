/* AZAAD Admin Enterprise Centers — one owner for enterprise overview panels. */
(() => {
  'use strict';
  if (window.AZAAD_ENTERPRISE_CENTERS) return;
  const URL='https://derofsthjivlkcdnojww.supabase.co';
  const KEY='sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const $=id=>document.getElementById(id);
  const D={patient360:['🧑‍⚕️ Patient 360','ملف المريض الكامل'],rcm:['🧾 Invoices & RCM','الفواتير والتحصيل'],analytics:['📊 Analytics','مؤشرات التشغيل'],finance:['💰 Finance','الإيرادات والمصروفات'],marketing:['📣 Marketing','العملاء المحتملون'],insights:['🧠 Smart Insights','توصيات مبنية على البيانات'],security:['🛡️ IT Security','حدود الأمان والحسابات']};
  const ROLE_SCOPES={patient360:['OWNER','ADMIN','MANAGER'],rcm:['OWNER','ADMIN','MANAGER','CASHIER'],analytics:['OWNER','ADMIN','MANAGER'],finance:['OWNER','ADMIN','MANAGER','CASHIER'],marketing:['OWNER','ADMIN','MANAGER','MARKETING'],insights:['OWNER','ADMIN','MANAGER'],security:['OWNER','ADMIN','MANAGER']};
  const role=()=>String(window.AZAAD?.state?.role||window.AZAAD?.state?.currentRole||window.AZAAD?.state?.staff?.role||document.body?.dataset?.role||'').toUpperCase().trim();
  const canAccess=key=>ROLE_SCOPES[key]?.includes(role())===true;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>`${Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2})} EGP`;
  const token=async()=>{const r=await window.AZAAD.supabase.auth.getSession();if(r.error||!r.data?.session?.access_token)throw new Error('جلسة الإدارة غير صالحة.');return r.data.session.access_token;};
  const call=async(path,t)=>{const r=await fetch(`${URL}/functions/v1/${path}`,{headers:{Authorization:`Bearer ${t}`,apikey:KEY,Accept:'application/json'},cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b?.error||`HTTP ${r.status}`);return b;};
  const cards=a=>a.map(x=>`<div class="item"><strong>${esc(x[0])}</strong><strong>${esc(x[1])}</strong></div>`).join('');
  const securityRows=(title,rows)=>rows.length?`<h3 style="margin:16px 0 8px">${esc(title)}</h3>${rows.map(r=>`<div class="item"><div><strong>${esc(r.action||r.event_type||r.type||'Security event')}</strong><div class="muted">${esc(r.entity_type||r.reason||r.message||'')}</div></div><span class="badge">${esc(r.created_at||'')}</span></div>`).join('')}`:`<div class="empty">لا توجد أحداث ${esc(title)} مسجلة.</div>`;
  const ensure=key=>{if(!canAccess(key))return;const id=`${key}EnterprisePanel`;if(!$(`${id}`)){const p=document.createElement('section');p.id=id;p.className='panel';p.innerHTML=`<div class="card"><div class="panel-head"><div><h2>${D[key][0]}</h2><div class="muted">${D[key][1]}</div></div><button class="btn btn-secondary" type="button" data-enterprise-refresh="${key}">🔄 تحديث</button></div><div id="${key}EnterpriseBody" class="items" style="margin-top:15px"><div class="empty">افتح القسم لقراءة البيانات.</div></div></div>`;$('adminPage')?.appendChild(p);}};
  function bind(){Object.keys(D).forEach(key=>ensure(key));Object.keys(D).filter(canAccess).forEach(key=>{const btn=document.querySelector(`[data-enterprise-refresh="${key}"]`);if(btn&&!btn.dataset.enterpriseBound){btn.dataset.enterpriseBound='1';btn.addEventListener('click',()=>render(key));}});}
  const rcmStatus=s=>{const x=String(s||'unpaid').toLowerCase();return ({paid:'🟢 مدفوعة',partial:'🟡 جزئية',unpaid:'🔴 غير مدفوعة',overdue:'⏰ متأخرة'}[x]||x);};
  const rcmRows=rows=>rows.length?`<div class="table" style="overflow:auto;margin-top:14px"><table style="width:100%;min-width:1050px;border-collapse:collapse"><thead><tr><th>🧾 الفاتورة</th><th>المريض</th><th>🆔 MRN</th><th>🧑‍⚕️ الطبيب</th><th>📅 التاريخ</th><th>💰 الإجمالي</th><th>💳 المدفوع</th><th>⚠️ المتبقي</th><th>🚦 الحالة</th></tr></thead><tbody>${rows.map(x=>{const p=Array.isArray(x.clinic_patients)?x.clinic_patients[0]||{}:x.clinic_patients||{};const d=Array.isArray(x.clinic_doctors)?x.clinic_doctors[0]||{}:x.clinic_doctors||{};return `<tr><td>${esc(x.invoice_number||x.id)}</td><td>${esc(p.patient_name||'—')}</td><td>${esc(p.mrn||'—')}</td><td>${esc(d.name||'—')}</td><td>${esc(x.invoice_date||x.created_at?.slice(0,10)||'—')}</td><td>${money(x.total_amount)}</td><td>${money(x.paid_amount)}</td><td>${money(x.remaining_amount)}</td><td>${esc(rcmStatus(x.status))}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">📭 لا توجد فواتير مطابقة.</div>';
  async function render(key){if(!canAccess(key))return;bind();const body=$(`${key}EnterpriseBody`);if(!body)return;body.innerHTML='<div class="empty">⏳ قراءة البيانات الفعلية...</div>';try{const t=await token();
    if(key==='patient360'){body.innerHTML='<label>رقم المريض / MRN / الاسم / الهاتف<input id="patient360Query" placeholder="AZA-000001 أو اسم المريض"></label><button id="patient360Search" class="btn btn-primary" type="button">🔎 بحث</button><div id="patient360Result" class="items" style="margin-top:12px"></div>';$('patient360Search').onclick=async()=>{const q=$('patient360Query').value.trim(),o=$('patient360Result');if(!q)return;o.innerHTML='<div class="empty">⏳</div>';try{const a=await call(`azaad-patient-360?q=${encodeURIComponent(q)}`,t),p=a.patients?.[0];if(!p){o.innerHTML='<div class="empty">لا يوجد مريض مطابق.</div>';return;}const f=await call(`azaad-patient-360?patient_id=${encodeURIComponent(p.id)}`,t);o.innerHTML=cards([['المريض',f.patient?.patient_name],['MRN',f.patient?.mrn],['الهاتف',f.patient?.patient_phone],['الحجوزات',f.summary?.booking_count],['الزيارات',f.summary?.visit_count],['الفواتير',money(f.summary?.total_invoices)],['المدفوع',money(f.summary?.total_paid)],['المتبقي',money(f.summary?.balance)]]);}catch(e){o.innerHTML=`<div class="error">${esc(e.message)}</div>`;}};return;}
    if(key==='rcm'){const d=await call('azaad-invoice-center?api=invoices&limit=200',t),s=d.summary||{};body.innerHTML=cards([['الفواتير',s.count],['إجمالي الفواتير',money(s.total)],['المحصّل',money(s.paid)],['المتبقي',money(s.remaining)],['مدفوعة',s.paid_invoices],['جزئية',s.partial_invoices],['غير مدفوعة',s.unpaid_invoices]])+rcmRows(d.invoices||[]);return;}
    if(key==='security'){const d=await call('azaad-security-center?limit=100',t);body.innerHTML=cards([['Security events',d.counts?.security_events||0],['Account security events',d.counts?.account_security_events||0],['Audit events',d.counts?.audit_events||0],['Authenticated role',d.actor?.role||'']])+securityRows('Security events',d.security_events||[])+securityRows('Account security events',d.account_security_events||[])+securityRows('Audit events',d.audit_events||[]);return;}
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'}).format(new Date());
    if(key==='finance'){const d=await call(`azaad-finance?api=dashboard&from=${today}&to=${today}`,t),s=d.summary||{};body.innerHTML=cards([['الحجوزات',s.bookings],['الإيرادات المحصلة',money(s.revenue)],['المصروفات',money(s.expenses)],['صافي التدفق',money(s.net)])+cards(Object.entries(d.payments_by_method||{}).map(([k,v])=>[`تحصيل ${k}`,money(v)]));return;}
    if(key==='insights'){const d=await call(`azaad-ai-insights?from=${today}&to=${today}`,t),rows=d.insights||[];body.innerHTML=cards([['Insights',rows.length],['Open follow-ups',d.kpis?.open_followups||0],['Open alerts',d.kpis?.open_alerts||0],['No-show rate',`${d.kpis?.no_show_rate||0}%`],['Outstanding',money(d.kpis?.outstanding||0)])+rows.map(r=>`<div class="item"><div><strong>${esc(r.title_ar||r.summary_ar||r.insight_type)}</strong><div class="muted">${esc(r.recommendation_ar||r.summary_ar||'')}</div><div class="muted">${esc(r.generated_at||'')}</div></div><span class="badge">${esc(r.severity)} · ${esc(r.status||'OPEN')} · ${esc(r.review_status||'PENDING')}</span></div>`).join('');return;}
    const d=await call(`azaad-management-dashboard?from=${today}&to=${today}`,t),k=d.kpis||{};
    if(key==='analytics')return void(body.innerHTML=cards([['الحجوزات',k.bookings],['مؤكد',k.confirmed],['مكتمل',k.completed],['No-Show',k.no_show],['معدل الإكمال',`${k.completion_rate}%`],['معدل No-Show',`${k.no_show_rate}%`],['الأطباء النشطون',k.active_doctors],['الموظفون النشطون',k.active_staff]]));
    if(key==='marketing')return void(body.innerHTML=cards([['Leads',k.marketing_leads],['Converted',k.converted_leads],['Conversion rate',`${k.lead_conversion_rate}%`])+`<div class="item"><strong>المصادر</strong><pre>${esc(JSON.stringify((d.marketing||{}).by_source||{},null,2))}</pre></div>`);
  }catch(e){body.innerHTML=`<div class="error">تعذر تحميل ${esc(D[key][0])}: ${esc(e.message)}</div>`;}}
  const activateKeyFromDom=()=>{const active=document.querySelector('.panel.active[id$="EnterprisePanel"]');if(!active)return;const key=active.id.replace(/EnterprisePanel$/,'');if(D[key]&&canAccess(key))render(key);};
  const handlePanelSignal=event=>{const panel=event.detail?.panel||'';const key=panel.endsWith('EnterprisePanel')?panel.replace('EnterprisePanel',''):'';if(D[key]&&canAccess(key))render(key);};
  const handleRoleReady=()=>{bind();activateKeyFromDom();};
  let roleObserver=null;
  const observeRoleReady=()=>{
    if(role()||!document.body)return;
    roleObserver=new MutationObserver(()=>{
      if(!role())return;
      roleObserver.disconnect();
      roleObserver=null;
      handleRoleReady();
    });
    roleObserver.observe(document.body,{attributes:true,attributeFilter:['data-role']});
  };
  window.addEventListener('azaad:admin-panel-activated',handlePanelSignal);
  window.addEventListener('azaad:admin-panel-ready',handlePanelSignal);
  window.addEventListener('azaad:admin-role-ready',handleRoleReady);
  bind();
  observeRoleReady();
  queueMicrotask(activateKeyFromDom);
  window.AZAAD_ENTERPRISE_CENTERS={render,bind};
})();