/* AZAAD Admin Enterprise Centers — one owner for enterprise domain panels. */
(() => {
  'use strict';
  if (window.AZAAD_ENTERPRISE_CENTERS) return;
  const URL='https://derofsthjivlkcdnojww.supabase.co';
  const KEY='sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const $=id=>document.getElementById(id);
  const D={
    patient360:['🧑‍⚕️ Patient 360','ملف المريض الكامل'],rcm:['🧾 Invoices & RCM','الفواتير والتحصيل'],
    analytics:['📊 Analytics','مؤشرات التشغيل'],finance:['💰 Finance','الإيرادات والمصروفات'],
    purchasing:['🛒 Purchasing','المشتريات الفعلية'],marketing:['📣 Marketing','العملاء المحتملون'],
    insights:['🧠 Smart Insights','توصيات مبنية على البيانات'],security:['🛡️ IT Security','حدود الأمان والحسابات']
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>`${Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2})} EGP`;
  const token=async()=>{const r=await window.AZAAD.supabase.auth.getSession();if(r.error||!r.data?.session?.access_token)throw new Error('جلسة الإدارة غير صالحة.');return r.data.session.access_token;};
  const call=async(path,t)=>{const r=await fetch(`${URL}/functions/v1/${path}`,{headers:{Authorization:`Bearer ${t}`,apikey:KEY,Accept:'application/json'},cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b?.error||`HTTP ${r.status}`);return b;};
  const cards=a=>a.map(x=>`<div class="item"><strong>${esc(x[0])}</strong><strong>${esc(x[1])}</strong></div>`).join('');
  const securityRows=(title,rows)=>rows.length?`<h3 style="margin:16px 0 8px">${esc(title)}</h3>${rows.map(r=>`<div class="item"><div><strong>${esc(r.action||r.event_type||r.type||'Security event')}</strong><div class="muted">${esc(r.entity_type||r.reason||r.message||'')}</div></div><span class="badge">${esc(r.created_at||'')}</span></div>`).join(''):`<div class="empty">لا توجد أحداث ${esc(title)} مسجلة.</div>`;
  const ensure=key=>{const id=`${key}EnterprisePanel`;if(!$(`${id}`)){const p=document.createElement('section');p.id=id;p.className='panel';p.innerHTML=`<div class="card"><div class="panel-head"><div><h2>${D[key][0]}</h2><div class="muted">${D[key][1]}</div></div><button class="btn btn-secondary" type="button" data-enterprise-refresh="${key}">🔄 تحديث</button></div><div id="${key}EnterpriseBody" class="items" style="margin-top:15px"><div class="empty">افتح القسم لقراءة البيانات.</div></div></div>`;$('adminPage')?.appendChild(p);} };
  function bind(){Object.keys(D).forEach(key=>{ensure(key);const tab=document.querySelector(`.tab[data-panel="${key}EnterprisePanel"]`);if(tab&&!tab.dataset.enterpriseBound){tab.dataset.enterpriseBound='1';tab.addEventListener('click',()=>render(key));}const btn=document.querySelector(`[data-enterprise-refresh="${key}"]`);if(btn&&!btn.dataset.enterpriseBound){btn.dataset.enterpriseBound='1';btn.addEventListener('click',()=>render(key));}});}
  async function render(key){bind();const body=$(`${key}EnterpriseBody`);if(!body)return;body.innerHTML='<div class="empty">⏳ قراءة البيانات الفعلية...</div>';try{const t=await token();
    if(key==='patient360'){body.innerHTML='<label>رقم المريض / MRN / الاسم / الهاتف<input id="patient360Query" placeholder="AZA-000001 أو اسم المريض"></label><button id="patient360Search" class="btn btn-primary" type="button">🔎 بحث</button><div id="patient360Result" class="items" style="margin-top:12px"></div>';$("patient360Search").onclick=async()=>{const q=$("patient360Query").value.trim(),o=$("patient360Result");if(!q)return;o.innerHTML='<div class="empty">⏳</div>';try{const a=await call(`azaad-patient-360?q=${encodeURIComponent(q)}`,t),p=a.patients?.[0];if(!p){o.innerHTML='<div class="empty">لا يوجد مريض مطابق.</div>';return;}const f=await call(`azaad-patient-360?patient_id=${encodeURIComponent(p.id)}`,t);o.innerHTML=cards([['المريض',f.patient?.patient_name],['MRN',f.patient?.mrn],['الهاتف',f.patient?.patient_phone],['الحجوزات',f.summary?.booking_count],['الزيارات',f.summary?.visit_count],['الفواتير',money(f.summary?.total_invoices)],['المدفوع',money(f.summary?.total_paid)],['المتبقي',money(f.summary?.balance)]]);}catch(e){o.innerHTML=`<div class="error">${esc(e.message)}</div>`;}};return;}
    if(key==='rcm'){const d=await call('azaad-invoice-center?api=invoices&limit=200',t),s=d.summary||{};body.innerHTML=cards([['الفواتير',s.count],['إجمالي الفواتير',money(s.total)],['المحصّل',money(s.paid)],['المتبقي',money(s.remaining)],['مدفوعة',s.paid_invoices],['جزئية',s.partial_invoices],['غير مدفوعة',s.unpaid_invoices]]);return;}
    if(key==='security'){const d=await call('azaad-security-center?limit=100',t);const all=[...(d.security_events||[]),...(d.account_security_events||[]),...(d.audit_events||[])];body.innerHTML=cards([['Security events',d.counts?.security_events||0],['Account security events',d.counts?.account_security_events||0],['Audit events',d.counts?.audit_events||0],['Authenticated role',d.actor?.role||'']])+securityRows('Security events',d.security_events||[])+securityRows('Account security events',d.account_security_events||[])+securityRows('Audit events',d.audit_events||[]);return;}
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'}).format(new Date());
    const d=await call(`azaad-management-dashboard?from=${today}&to=${today}`,t),k=d.kpis||{};
    if(key==='analytics')return void(body.innerHTML=cards([['الحجوزات',k.bookings],['مؤكد',k.confirmed],['مكتمل',k.completed],['No-Show',k.no_show],['معدل الإكمال',`${k.completion_rate}%`],['معدل No-Show',`${k.no_show_rate}%`],['الأطباء النشطون',k.active_doctors],['الموظفون النشطون',k.active_staff]]));
    if(key==='finance')return void(body.innerHTML=cards([['إجمالي الفواتير',money(k.invoiced)],['التحصيل',money(k.collected)],['المستحق',money(k.outstanding)],['المصروفات',money(k.expenses)],['المشتريات',money(k.purchases)],['صافي التدفق',money(k.net_cash_flow)]]));
    if(key==='purchasing')return void(body.innerHTML=cards([['المشتريات اليوم',money(k.purchases)],['التحصيل اليوم',money(k.collected)],['الصافي بعد المصروفات والمشتريات',money(k.net_cash_flow)]]));
    if(key==='marketing'){const m=d.marketing||{};return void(body.innerHTML=cards([['Leads',k.marketing_leads],['Converted',k.converted_leads],['Conversion rate',`${k.lead_conversion_rate}%`]])+`<div class="item"><strong>المصادر</strong><pre>${esc(JSON.stringify(m.by_source||{},null,2))}</pre></div>`);}
    if(key==='insights')return void(body.innerHTML=(d.recommendations||[]).map(r=>`<div class="item"><div><strong>${esc(r.title_ar)}</strong><div class="muted">${esc(r.recommendation_ar)}</div></div><span class="badge">${esc(r.severity)}</span></div>`).join('')||'<div class="empty">لا توجد توصيات حالية.</div>');
  }catch(e){body.innerHTML=`<div class="error">تعذر تحميل ${esc(D[key][0])}: ${esc(e.message)}</div>`;}}
  bind();
  window.AZAAD_ENTERPRISE_CENTERS={render,bind};
  const active=document.querySelector('.tab.active[data-panel$="EnterprisePanel"]')?.dataset.panel; if(active) render(active.replace('EnterprisePanel',''));
})();
