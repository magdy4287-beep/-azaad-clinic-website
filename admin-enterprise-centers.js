/* AZAAD Admin Enterprise Centers — one owner for enterprise domain panels. */
(() => {
  'use strict';
  if (window.AZAAD_ENTERPRISE_CENTERS) return;

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const $ = id => document.getElementById(id);

  const domains = {
    patient360: { title: '🧑‍⚕️ Patient 360', subtitle: 'ملف المريض الكامل: حجوزات، زيارات، فواتير، مدفوعات، تنبيهات ومتابعات.' },
    rcm: { title: '🧾 Invoices & RCM', subtitle: 'الفواتير والتحصيل والمتبقي من المصدر المالي المحمي.' },
    analytics: { title: '📊 Analytics', subtitle: 'مؤشرات التشغيل اليومية والشهرية وأداء الأطباء.' },
    finance: { title: '💰 Finance', subtitle: 'الإيرادات، التحصيل، المصروفات وصافي التدفق النقدي.' },
    purchasing: { title: '🛒 Purchasing', subtitle: 'المشتريات الفعلية من بيانات التشغيل المالية.' },
    marketing: { title: '📣 Marketing', subtitle: 'العملاء المحتملون ومصادرهم وحالة التحويل.' },
    insights: { title: '🧠 Smart Insights', subtitle: 'توصيات مشتقة من مؤشرات التشغيل الفعلية، وليست نصوصًا ثابتة.' },
    security: { title: '🛡️ IT Security', subtitle: 'حدود الأمان وإدارة الحسابات الحساسة.' }
  };

  function ensurePanel(key) {
    if ($(`${key}EnterprisePanel`)) return;
    const d = domains[key];
    const panel = document.createElement('section');
    panel.id = `${key}EnterprisePanel`;
    panel.className = 'panel';
    panel.innerHTML = `<div class="card"><div class="panel-head"><div><h2>${d.title}</h2><div class="muted">${d.subtitle}</div></div><button class="btn btn-secondary" type="button" data-enterprise-refresh="${key}">🔄 تحديث</button></div><div id="${key}EnterpriseBody" class="items" style="margin-top:15px"><div class="empty">⏳ جاري التحميل...</div></div></div>`;
    $('adminPage')?.appendChild(panel);
  }

  function ensureTab(key) {
    if (document.querySelector(`.tab[data-panel="${key}EnterprisePanel"]`)) return;
    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.dataset.panel = `${key}EnterprisePanel`;
    tab.type = 'button';
    tab.textContent = domains[key].title;
    document.querySelector('.tabs')?.appendChild(tab);
  }

  async function sessionToken() {
    const client = window.AZAAD?.supabase;
    if (!client) throw new Error('Admin Supabase client is not ready');
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session?.access_token) throw new Error('جلسة الإدارة غير صالحة أو منتهية.');
    return data.session.access_token;
  }

  async function call(path, token) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
      headers: { Authorization: `Bearer ${token}`, apikey: PUBLISHABLE_KEY, Accept: 'application/json' },
      cache: 'no-store'
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`);
    return body;
  }

  const money = value => `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);

  function cards(items) {
    return items.map(([label, value]) => `<div class="item"><strong>${escape(label)}</strong><strong>${escape(value)}</strong></div>`).join('');
  }

  async function render(key) {
    ensurePanel(key); ensureTab(key);
    const body = $(`${key}EnterpriseBody`);
    if (!body) return;
    body.innerHTML = '<div class="empty">⏳ جاري قراءة البيانات الفعلية...</div>';
    try {
      const token = await sessionToken();
      if (key === 'patient360') {
        body.innerHTML = `<div class="grid"><label class="full">رقم المريض / MRN / الاسم / الهاتف<input id="patient360Query" placeholder="AZA-000001 أو اسم المريض"></label></div><button class="btn btn-primary" id="patient360Search">🔎 بحث</button><div id="patient360Result" class="items" style="margin-top:12px"></div>`;
        $('patient360Search').onclick = async () => {
          const q = $('patient360Query')?.value.trim(); const result = $('patient360Result');
          if (!q) return;
          result.innerHTML = '<div class="empty">⏳</div>';
          try { const data = await call(`azaad-patient-360?q=${encodeURIComponent(q)}`, token); const p = data.patients?.[0]; if (!p) { result.innerHTML = '<div class="empty">لا يوجد مريض مطابق.</div>'; return; } result.innerHTML = cards([['المريض', p.patient_name], ['MRN', p.mrn], ['الهاتف', p.patient_phone], ['عدد الحجوزات', data.summary?.booking_count ?? 0], ['عدد الزيارات', data.summary?.visit_count ?? 0], ['إجمالي الفواتير', money(data.summary?.total_invoices)], ['المدفوع', money(data.summary?.total_paid)], ['المتبقي', money(data.summary?.balance)]]); } catch (e) { result.innerHTML = `<div class="error">${escape(e.message)}</div>`; }
        }; return;
      }
      if (key === 'rcm') {
        const data = await call('azaad-invoice-center?api=invoices&limit=200', token); const s = data.summary || {}; body.innerHTML = cards([['الفواتير', s.count ?? 0], ['إجمالي الفواتير', money(s.total)], ['المحصّل', money(s.paid)], ['المتبقي', money(s.remaining)], ['مدفوعة', s.paid_invoices ?? 0], ['جزئية', s.partial_invoices ?? 0], ['غير مدفوعة', s.unpaid_invoices ?? 0]]) + `<div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Patient</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead><tbody>${(data.invoices||[]).slice(0,100).map(i=>`<tr><td>${escape(i.invoice_number)}</td><td>${escape(i.clinic_patients?.patient_name || '-')}</td><td>${money(i.total_amount)}</td><td>${money(i.paid_amount)}</td><td>${money(i.remaining_amount)}</td><td>${escape(i.status)}</td></tr>`).join('')}</tbody></table></div>`; return;
      }
      const data = await call(`azaad-management-dashboard?from=${today()}&to=${today()}`, token);
      const k = data.kpis || {};
      if (key === 'analytics') { body.innerHTML = cards([['حجوزات اليوم', k.bookings], ['مؤكد', k.confirmed], ['مكتمل', k.completed], ['No-Show', k.no_show], ['معدل الإكمال', `${k.completion_rate}%`], ['معدل No-Show', `${k.no_show_rate}%`], ['الأطباء النشطون', k.active_doctors], ['الموظفون النشطون', k.active_staff]]); return; }
      if (key === 'finance') { body.innerHTML = cards([['إجمالي الفواتير', money(k.invoiced)], ['التحصيل', money(k.collected)], ['المستحق', money(k.outstanding)], ['المصروفات', money(k.expenses)], ['المشتريات', money(k.purchases)], ['صافي التدفق النقدي', money(k.net_cash_flow)]]); return; }
      if (key === 'purchasing') { body.innerHTML = cards([['إجمالي المشتريات اليوم', money(k.purchases)], ['التحصيل اليوم', money(k.collected)], ['صافي بعد المشتريات والمصروفات', money(k.net_cash_flow)]]) + `<div class="table-wrap"><table><thead><tr><th>الصنف</th><th>الكمية</th><th>الإجمالي</th><th>المورد</th></tr></thead><tbody>${(data.purchases||[]).map(p=>`<tr><td>${escape(p.item_name)}</td><td>${escape(p.quantity)}</td><td>${money(p.total)}</td><td>${escape(p.supplier)}</td></tr>`).join('')}</tbody></table></div>`; return; }
      if (key === 'marketing') { const m=data.marketing||{}; body.innerHTML=cards([['Leads', k.marketing_leads], ['Converted', k.converted_leads], ['Conversion rate', `${k.lead_conversion_rate}%`]]) + `<div class="item"><strong>المصادر</strong><pre>${escape(JSON.stringify(m.by_source||{}, null, 2))}</pre></div>`; return; }
      if (key === 'insights') { body.innerHTML=(data.recommendations||[]).map(r=>`<div class="item"><div><strong>${escape(r.title_ar)}</strong><div class="muted">${escape(r.recommendation_ar)}</div></div><span class="badge">${escape(r.severity)}</span></div>`).join('') || '<div class="empty">لا توجد توصيات حالية.</div>'; return; }
      if (key === 'security') { body.innerHTML = cards([['Auth boundary','Supabase Auth + active clinic_staff'],['Sensitive operations','Owner/Admin role-gated'],['Session control','azaad-account-security'],['Audit boundary','clinic_account_security_audit'],['Status','Security control plane active']]) + '<div class="muted">قراءة سجل الأمان التفصيلي ليست مفتوحة للمتصفح؛ العمليات الحساسة تمر عبر Edge Function محمية.</div>'; return; }
    } catch (e) { body.innerHTML = `<div class="error">تعذر تحميل ${escape(domains[key].title)}: ${escape(e.message)}</div>`; }
  }

  function init() {
    Object.keys(domains).forEach(key => { ensureTab(key); ensurePanel(key); });
    document.querySelectorAll('[data-enterprise-refresh]').forEach(btn => { if (btn.dataset.bound) return; btn.dataset.bound='1'; btn.onclick=()=>render(btn.dataset.enterpriseRefresh); });
    document.querySelectorAll('.tab[data-panel$="EnterprisePanel"]').forEach(tab => { tab.addEventListener('click', () => setTimeout(() => render(tab.dataset.panel.replace('EnterprisePanel','')), 0), { once: false }); });
    window.AZAAD_ENTERPRISE_CENTERS = { init, render };
  }
  init();
})();
