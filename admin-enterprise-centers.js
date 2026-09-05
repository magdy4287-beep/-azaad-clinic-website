/* AZAAD Admin Enterprise Centers — canonical enterprise panel owner. */
(() => {
  'use strict';
  if (window.AZAAD_ENTERPRISE_CENTERS) return;

  const $ = (id) => document.getElementById(id);
  const D = {
    patient360: ['🧑‍⚕️ Patient 360', 'ملف المريض الكامل'],
    rcm: ['🧾 Invoices & RCM', 'الفواتير والتحصيل'],
    analytics: ['📊 Analytics', 'مؤشرات التشغيل'],
    finance: ['💰 Finance', 'الإيرادات والمصروفات'],
    marketing: ['📣 Marketing', 'العملاء المحتملون'],
    insights: ['🧠 Smart Insights', 'توصيات مبنية على البيانات'],
    security: ['🛡️ IT Security', 'حدود الأمان والحسابات'],
  };
  const ROLE_SCOPES = {
    patient360: ['OWNER', 'ADMIN', 'MANAGER'],
    rcm: ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'],
    analytics: ['OWNER', 'ADMIN', 'MANAGER'],
    finance: ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'],
    marketing: ['OWNER', 'ADMIN', 'MANAGER', 'MARKETING'],
    insights: ['OWNER', 'ADMIN', 'MANAGER'],
    security: ['OWNER', 'ADMIN', 'MANAGER'],
  };

  const role = () => String(
    window.AZAAD?.state?.role ||
    window.AZAAD?.state?.currentRole ||
    window.AZAAD?.state?.staff?.role ||
    document.body?.dataset?.role || ''
  ).toUpperCase().trim();
  const canAccess = (key) => ROLE_SCOPES[key]?.includes(role()) === true;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
  const money = (value) => `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP`;

  async function call(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      cache: 'no-store',
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`);
    return body;
  }

  const cards = (items) => items.map((item) => (
    `<div class="item"><strong>${esc(item[0])}</strong><strong>${esc(item[1])}</strong></div>`
  )).join('');

  const ensure = (key) => {
    if (!canAccess(key)) return;
    const id = `${key}EnterprisePanel`;
    if ($(id)) return;
    const panel = document.createElement('section');
    panel.id = id;
    panel.className = 'panel';
    panel.innerHTML = `<div class="card"><div class="panel-head"><div><h2>${D[key][0]}</h2><div class="muted">${D[key][1]}</div></div><button class="btn btn-secondary" type="button" data-enterprise-refresh="${key}">🔄 تحديث</button></div><div id="${key}EnterpriseBody" class="items" style="margin-top:15px"><div class="empty">افتح القسم لقراءة البيانات.</div></div></div>`;
    $('adminPage')?.appendChild(panel);
  };

  function bind() {
    Object.keys(D).forEach(ensure);
    Object.keys(D).filter(canAccess).forEach((key) => {
      const button = document.querySelector(`[data-enterprise-refresh="${key}"]`);
      if (button && !button.dataset.enterpriseBound) {
        button.dataset.enterpriseBound = '1';
        button.addEventListener('click', () => render(key));
      }
    });
  }

  const rcmStatus = (status) => ({
    paid: '🟢 مدفوعة', partial: '🟡 جزئية', unpaid: '🔴 غير مدفوعة', overdue: '⏰ متأخرة'
  }[String(status || 'unpaid').toLowerCase()] || String(status || 'unpaid'));

  const rcmRows = (rows) => rows.length
    ? `<div class="table" style="overflow:auto;margin-top:14px"><table style="width:100%;min-width:1050px;border-collapse:collapse"><thead><tr><th>🧾 الفاتورة</th><th>المريض</th><th>🆔 MRN</th><th>🧑‍⚕️ الطبيب</th><th>📅 التاريخ</th><th>💰 الإجمالي</th><th>💳 المدفوع</th><th>⚠️ المتبقي</th><th>🚦 الحالة</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${esc(row.invoice_number || row.id)}</td><td>${esc(row.patient_name || '—')}</td><td>${esc(row.mrn || '—')}</td><td>${esc(row.doctor_name || '—')}</td><td>${esc(row.invoice_date || row.created_at?.slice(0, 10) || '—')}</td><td>${money(row.total_amount)}</td><td>${money(row.paid_amount)}</td><td>${money(row.remaining_amount)}</td><td>${esc(rcmStatus(row.status))}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="empty">📭 لا توجد فواتير مطابقة.</div>';

  async function render(key) {
    if (!canAccess(key)) return;
    bind();
    const body = $(`${key}EnterpriseBody`);
    if (!body) return;
    body.innerHTML = '<div class="empty">⏳ قراءة البيانات الفعلية...</div>';
    try {
      // Enterprise data is intentionally routed through same-origin API boundaries.
      // The browser never receives a database credential or a legacy provider client.
      if (key === 'patient360') {
        body.innerHTML = '<label>رقم المريض / MRN / الاسم / الهاتف<input id="patient360Query" placeholder="AZA-000001 أو اسم المريض"></label><button id="patient360Search" class="btn btn-primary" type="button">🔎 بحث</button><div id="patient360Result" class="items" style="margin-top:12px"></div>';
        $('patient360Search').onclick = async () => {
          const query = $('patient360Query').value.trim();
          const output = $('patient360Result');
          if (!query) return;
          output.innerHTML = '<div class="empty">⏳</div>';
          try {
            const data = await call(`/api/patient-financial-summary?q=${encodeURIComponent(query)}`);
            output.innerHTML = cards([['المريض', data.patient?.patient_name], ['MRN', data.patient?.mrn], ['الهاتف', data.patient?.patient_phone], ['الفواتير', money(data.summary?.total_invoices)], ['المدفوع', money(data.summary?.total_paid)], ['المتبقي', money(data.summary?.balance)]]);
          } catch (error) {
            output.innerHTML = `<div class="error">${esc(error.message)}</div>`;
          }
        };
        return;
      }

      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
      if (key === 'analytics') {
        const data = await call(`/api/admin-appointments?from=${today}&to=${today}`);
        const k = data.kpis || data.summary || {};
        body.innerHTML = cards([['الحجوزات', k.bookings || data.count], ['مؤكد', k.confirmed], ['مكتمل', k.completed], ['No-Show', k.no_show], ['معدل الإكمال', `${k.completion_rate || 0}%`]]);
        return;
      }
      if (key === 'insights') {
        const data = await call(`/api/ai-insights?from=${today}&to=${today}`);
        const rows = data.insights || [];
        body.innerHTML = cards([['Insights', rows.length], ['Open follow-ups', data.kpis?.open_followups || 0], ['Open alerts', data.kpis?.open_alerts || 0], ['No-show rate', `${data.kpis?.no_show_rate || 0}%`]]) + rows.map((row) => `<div class="item"><div><strong>${esc(row.title_ar || row.summary_ar || row.insight_type)}</strong><div class="muted">${esc(row.recommendation_ar || row.summary_ar || '')}</div></div><span class="badge">${esc(row.severity || '')} · ${esc(row.status || 'OPEN')}</span></div>`).join('');
        return;
      }
      // Remaining enterprise panels expose a safe, explicit empty state until their
      // same-origin API boundary is present; they never fall back to Supabase.
      if (key === 'rcm') {
        body.innerHTML = rcmRows([]);
        return;
      }
      if (key === 'finance' || key === 'marketing' || key === 'security') {
        body.innerHTML = '<div class="empty">بيانات الوحدة متاحة عبر حدود الخادم الآمنة وسيتم عرضها بعد تهيئة نقطة API الخاصة بها.</div>';
        return;
      }
      body.innerHTML = '<div class="empty">لا توجد بيانات متاحة حاليًا.</div>';
    } catch (error) {
      body.innerHTML = `<div class="error">تعذر تحميل ${esc(D[key][0])}: ${esc(error.message)}</div>`;
    }
  }

  const activateKeyFromDom = () => {
    const active = document.querySelector('.panel.active[id$="EnterprisePanel"]');
    if (!active) return;
    const key = active.id.replace(/EnterprisePanel$/, '');
    if (D[key] && canAccess(key)) render(key);
  };
  const handlePanelSignal = (event) => {
    const panel = event.detail?.panel || '';
    const key = panel.endsWith('EnterprisePanel') ? panel.replace('EnterprisePanel', '') : '';
    if (D[key] && canAccess(key)) render(key);
  };
  const handleRoleReady = () => { bind(); activateKeyFromDom(); };

  let roleObserver = null;
  const observeRoleReady = () => {
    if (role() || !document.body) return;
    roleObserver = new MutationObserver(() => {
      if (!role()) return;
      roleObserver.disconnect();
      roleObserver = null;
      handleRoleReady();
    });
    roleObserver.observe(document.body, { attributes: true, attributeFilter: ['data-role'] });
  };

  window.addEventListener('azaad:admin-panel-activated', handlePanelSignal);
  window.addEventListener('azaad:admin-panel-ready', handlePanelSignal);
  window.addEventListener('azaad:admin-role-ready', handleRoleReady);
  bind();
  observeRoleReady();
  queueMicrotask(activateKeyFromDom);
  window.AZAAD_ENTERPRISE_CENTERS = { render, bind };
})();
