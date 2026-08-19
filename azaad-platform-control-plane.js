(() => {
  'use strict';
  const state = { loaded:false, lang:'ar', data:null };
  const t = (ar,en) => state.lang === 'en' ? en : ar;
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const client = () => window.AZAAD?.supabase || null;
  const canView = () => Boolean(window.AZAAD?.hasPermission?.('dashboard.view') || window.AZAAD?.hasPermission?.('finance.view') || window.AZAAD?.hasPermission?.('staff.view'));

  function styles(){
    if(document.getElementById('azaadControlPlaneStyles')) return;
    const s=document.createElement('style'); s.id='azaadControlPlaneStyles'; s.textContent=`
      #azaadControlPlane{margin:16px 0}.azcp-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.azcp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.azcp-card{background:#fff;border:1px solid #e1e5ef;border-radius:16px;padding:15px}.azcp-value{font-size:28px;font-weight:900;color:#17214f}.azcp-label{color:#6c758c;font-size:12px;margin-top:5px}.azcp-section{margin-top:14px}.azcp-section h3{margin:0 0 10px}.azcp-badges{display:flex;gap:8px;flex-wrap:wrap}.azcp-badge{border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800;background:#f3f5fa}.azcp-ok{background:#e7f7ed;color:#167345}.azcp-warn{background:#fff4cc;color:#755c00}.azcp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.azcp-note{padding:11px;border-radius:12px;background:#f5f7fb;color:#34436f;line-height:1.65}.azcp-kpi{min-height:105px}.azcp-ai{border:1px solid #e0d9bd;background:linear-gradient(135deg,#f4f6ff,#fff9ed)}@media(max-width:900px){.azcp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.azcp-grid{grid-template-columns:1fr}}
    `; document.head.appendChild(s);
  }

  function host(){
    let node=document.getElementById('azaadControlPlane'); if(node) return node;
    const admin=document.getElementById('adminPage'); if(!admin) return null;
    node=document.createElement('section'); node.id='azaadControlPlane'; node.className='card';
    const topbar=admin.querySelector('.topbar');
    if(topbar?.parentNode) topbar.parentNode.insertBefore(node,topbar.nextSibling); else admin.prepend(node);
    return node;
  }

  async function queryDashboard(){
    const db=client(); if(!db) throw new Error('Supabase client unavailable');
    const today=new Date().toISOString().slice(0,10), tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
    const results=await Promise.all([
      db.from('clinic_bookings').select('id,status,appointment_date',{count:'exact'}).gte('appointment_date',today).lt('appointment_date',tomorrow),
      db.from('clinic_staff').select('id,active,account_status,role,department',{count:'exact'}),
      db.from('clinic_security_events').select('id,severity,created_at',{count:'exact'}).gte('created_at',new Date(Date.now()-86400000).toISOString()),
      db.from('clinic_feature_flags').select('key,enabled,rollout_percent,config').like('key','platform.%'),
      db.rpc('azaad_daily_finance_report',{p_from:today,p_to:today})
    ]);
    const error=results.map(x=>x.error).find(Boolean); if(error) throw error;
    const [bookings,staff,security,flags,finance]=results;
    return {bookings:bookings.data||[],staff:staff.data||[],security:security.data||[],flags:flags.data||[],finance:finance.data||{}};
  }

  function metrics(data){
    const todayBookings=data.bookings.length;
    const confirmed=data.bookings.filter(x=>['confirmed','CONFIRMED'].includes(String(x.status))).length;
    const checkedIn=data.bookings.filter(x=>['checked_in','CHECKED_IN'].includes(String(x.status))).length;
    const activeStaff=data.staff.filter(x=>x.active&&x.account_status!=='disabled'&&x.account_status!=='archived').length;
    const securityEvents=data.security.length;
    const revenue=Number(data.finance?.total_revenue??data.finance?.revenue??data.finance?.collected??0)||0;
    return {todayBookings,confirmed,checkedIn,activeStaff,securityEvents,revenue};
  }

  function aiSuggestions(data){
    const m=metrics(data), suggestions=[];
    if(m.todayBookings===0) suggestions.push(t('لا توجد حجوزات اليوم؛ راجع الطلبات أو جدول الأطباء.','No bookings today; review requests or doctor schedules.'));
    if(m.todayBookings&&m.checkedIn===0) suggestions.push(t('لا يوجد Check-in اليوم حتى الآن؛ راجع الاستقبال والطلبات المؤكدة.','No check-ins yet today; review front-desk flow and confirmed requests.'));
    if(m.securityEvents>0) suggestions.push(t(`يوجد ${m.securityEvents} حدث أمني خلال آخر 24 ساعة ويستحق المراجعة.`,`${m.securityEvents} security event(s) occurred in the last 24 hours and should be reviewed.`));
    if(!suggestions.length) suggestions.push(t('لا توجد إشارة تشغيلية واضحة تحتاج تدخلًا الآن.','No obvious operational signal currently requires intervention.'));
    return suggestions;
  }

  function render(data){
    const h=host(); if(!h) return; const m=metrics(data), enabled=data.flags.filter(x=>x.enabled&&Number(x.rollout_percent)>0).length;
    h.innerHTML=`<div class="azcp-head"><div><h2 style="margin:0">🧭 ${t('AZAAD Command Center','AZAAD Command Center')}</h2><div class="muted">${t('طبقة تشغيل موحدة: بيانات حقيقية + صلاحيات + Workflow + Audit + AI مساعد.','Unified operating layer: real data + permissions + workflow + audit + assistive AI.')}</div></div><button id="azcpRefresh" class="btn btn-secondary" type="button">🔄 ${t('تحديث','Refresh')}</button></div>
      <div class="azcp-grid"><div class="azcp-card azcp-kpi"><div class="azcp-value">${m.todayBookings}</div><div class="azcp-label">📅 ${t('حجوزات اليوم','Today bookings')}</div></div><div class="azcp-card azcp-kpi"><div class="azcp-value">${m.confirmed}</div><div class="azcp-label">✅ ${t('مؤكدة','Confirmed')}</div></div><div class="azcp-card azcp-kpi"><div class="azcp-value">${m.checkedIn}</div><div class="azcp-label">🟢 Check-in</div></div><div class="azcp-card azcp-kpi"><div class="azcp-value">${m.revenue.toLocaleString()}</div><div class="azcp-label">💰 ${t('تحصيل اليوم','Today collection')}</div></div></div>
      <div class="azcp-grid"><div class="azcp-card"><div class="azcp-value">${m.activeStaff}</div><div class="azcp-label">👥 ${t('الموظفون النشطون','Active staff')}</div></div><div class="azcp-card"><div class="azcp-value">${m.securityEvents}</div><div class="azcp-label">🛡️ ${t('أحداث أمنية / 24 ساعة','Security events / 24h')}</div></div><div class="azcp-card"><div class="azcp-value">${enabled}</div><div class="azcp-label">🚦 ${t('خصائص مفعلة','Enabled features')}</div></div><div class="azcp-card"><div class="azcp-value">ON</div><div class="azcp-label">⚙️ Workflow Engine</div></div></div>
      <div class="azcp-section azcp-card"><h3>🛡️ ${t('Safety Gates','Safety Gates')}</h3><div class="azcp-badges"><span class="azcp-badge azcp-ok">${t('AI = اقتراح فقط','AI = suggestion only')}</span><span class="azcp-badge azcp-ok">${t('Refund = موافقات بشرية','Refund = human approvals')}</span><span class="azcp-badge azcp-ok">Feature Flags</span><span class="azcp-badge azcp-ok">Audit Trail</span><span class="azcp-badge azcp-ok">RLS / Permissions</span></div></div>
      <div class="azcp-section azcp-card azcp-ai"><h3>🤖 ${t('AZAAD AI Copilot','AZAAD AI Copilot')}</h3><div class="azcp-note">${t('الاقتراحات مبنية على بيانات التشغيل الحالية. لا يوجد قرار تلقائي ولا اعتماد مالي/سريري من AI.','Suggestions are based on current operational data. No automatic decision and no clinical/financial approval by AI.')}</div><ul>${aiSuggestions(data).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><div class="azcp-actions"><button id="azcpSaveAi" class="btn btn-gold" type="button">💡 ${t('حفظ الاقتراحات للمراجعة البشرية','Save suggestions for human review')}</button></div></div>
      <div class="azcp-section azcp-card"><h3>🧩 ${t('Platform Modules','Platform Modules')}</h3><div class="azcp-badges">${data.flags.map(f=>`<span class="azcp-badge ${f.enabled?'azcp-ok':'azcp-warn'}">${esc(f.key.replace('platform.',''))} · ${f.enabled?'100%':'OFF'}</span>`).join('')}</div></div>`;
    document.getElementById('azcpRefresh').onclick=load; document.getElementById('azcpSaveAi').onclick=saveSuggestions;
  }

  async function saveSuggestions(){
    const db=client(); if(!db||!state.data) return;
    const staff=window.AZAAD?.state?.staff||{};
    const rows=aiSuggestions(state.data).map(recommendation=>({department:staff.department||null,role:staff.role||null,context_type:'executive_command_center',recommendation,evidence:{metrics:metrics(state.data)},provider:'local-free',status:'PROPOSED',human_actor_staff_id:null}));
    const result=await db.from('clinic_ai_recommendations').insert(rows);
    if(!result.error) window.AZAAD?.refresh?.();
  }

  async function load(){
    if(!canView()) return;
    try{state.data=await queryDashboard();state.loaded=true;render(state.data);}catch(error){const h=host();if(h)h.innerHTML=`<div class="error">⚠️ ${esc(error.message||t('تعذر تحميل Command Center','Unable to load Command Center'))}</div>`;}
  }

  function init(){
    if(window.__AZAAD_PLATFORM_CONTROL_PLANE__) return; window.__AZAAD_PLATFORM_CONTROL_PLANE__=true; styles();
    state.lang=window.AZAAD_I18N?.language?.()||(document.documentElement.lang==='en'?'en':'ar');
    window.addEventListener('azaadLanguageChanged',event=>{state.lang=event.detail?.language==='en'?'en':'ar';if(state.data)render(state.data);});
    const start=()=>setTimeout(load,0); if(window.AZAAD?.initialized||window.AZAAD?.state?.initialized) start(); else window.addEventListener('load',start,{once:true});
  }
  init();
})();
