/* AZAAD CLINIC — ADMIN NEXT-GEN RELIABILITY / SEARCH / I18N FIXES
 * Free-first, additive overlay. Does not replace the existing admin controller.
 * Goals:
 * - One bilingual language control; no Arabic/Arabic duplicate buttons.
 * - Switch Arabic <-> English without reload/sign-out.
 * - Preserve Arabic source text so switching back is lossless.
 * - Booking day search: name / phone / MRN / booking number + any date.
 * - Patient reception: universal search + per-phone search action.
 * - Reuse existing authenticated Edge Functions; no service-role key.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const PATIENTS_API = `${SUPABASE_URL}/functions/v1/azaad-patients`;
  const APPOINTMENTS_API = `${SUPABASE_URL}/functions/v1/azaad-appointments-center`;
  const LANG_KEY = 'azaadClinicLanguage';
  const ADMIN_LANG_KEY = 'azaad_admin_lang';

  const state = {
    language: 'ar',
    textSources: new WeakMap(),
    bookingDate: '',
    bookingRequest: 0,
    patientRequest: 0,
    installed: false,
    reapplying: false
  };

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[c]));
  const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const isAdmin = () => /admin\.html$/i.test(location.pathname) || !!$('.admin');
  const english = () => state.language === 'en';
  const t = (ar, en) => english() ? en : ar;

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function normalizeMRN(value) {
    const raw = normalize(value).toUpperCase();
    if (/^AZA-\d{6}$/.test(raw)) return raw;
    if (/^AZA\d{6}$/.test(raw)) return `AZA-${raw.slice(3)}`;
    if (/^\d{1,6}$/.test(raw)) return `AZA-${raw.padStart(6,'0')}`;
    return '';
  }

  function displayMRN(value) {
    const mrn = normalizeMRN(value);
    return mrn ? `Patient ${mrn.slice(4)}` : (value || '—');
  }

  function language() {
    try {
      const a = localStorage.getItem(ADMIN_LANG_KEY);
      if (a === 'en' || a === 'ar') return a;
      const b = localStorage.getItem(LANG_KEY);
      if (b === 'en' || b === 'ar') return b;
    } catch (_) {}
    return String(document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  }

  function dictionaries() {
    const central = window.AZAAD_I18N?.dictionary || {};
    const hardening = window.AZAAD_ADMIN_ENGLISH_HARDENING?.map || {};
    return { ...central, ...hardening };
  }

  function reverseDictionary(dict) {
    const reverse = new Map();
    Object.entries(dict).forEach(([ar, en]) => {
      if (!reverse.has(normalize(en))) reverse.set(normalize(en), ar);
    });
    return reverse;
  }

  function translateText(source, lang, dict, reverse) {
    let value = String(source ?? '');
    if (!value) return value;
    if (lang === 'ar') {
      let out = value;
      Object.entries(reverse).sort((a,b) => b[0].length - a[0].length).forEach(([en, ar]) => {
        if (en && out.includes(en)) out = out.split(en).join(ar);
      });
      return out;
    }
    const keys = Object.keys(dict).sort((a,b) => b.length - a.length);
    for (const ar of keys) {
      if (ar && value.includes(ar)) value = value.split(ar).join(dict[ar]);
    }
    return value;
  }

  function translateNode(node, dict, reverse) {
    if (!node?.nodeValue || !node.parentElement) return;
    const parent = node.parentElement;
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/i.test(parent.tagName)) return;
    if (parent.closest('[data-no-i18n],textarea,input,select')) return;

    let source = state.textSources.get(node);
    if (source == null) {
      const current = String(node.nodeValue);
      const candidate = normalize(current);
      const reverseSource = reverse.get(candidate);
      source = reverseSource || current;
      state.textSources.set(node, source);
    }

    const next = translateText(source, state.language, dict, reverse);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function translateAttributes(dict, reverse) {
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
      ['placeholder','title','aria-label'].forEach(attr => {
        const current = el.getAttribute(attr);
        if (!current) return;
        const key = `attr:${attr}`;
        let source = el.dataset[key];
        if (!source) {
          const reverseSource = reverse.get(normalize(current));
          source = reverseSource || current;
          try { el.dataset[key] = source; } catch (_) {}
        }
        const next = translateText(source, state.language, dict, reverse);
        if (next !== current) el.setAttribute(attr, next);
      });
    });

    document.querySelectorAll('option').forEach(option => {
      const current = option.textContent || '';
      if (!option.dataset.azaadOptionAr) {
        const reverseSource = reverse.get(normalize(current));
        option.dataset.azaadOptionAr = reverseSource || current;
      }
      option.textContent = translateText(option.dataset.azaadOptionAr, state.language, dict, reverse);
    });
  }

  function applyLanguage() {
    if (!isAdmin() || state.reapplying) return;
    state.reapplying = true;
    try {
      const dict = dictionaries();
      const reverse = reverseDictionary(dict);
      document.documentElement.lang = state.language;
      document.documentElement.dir = state.language === 'en' ? 'ltr' : 'rtl';
      document.title = state.language === 'en' ? 'Azaad Clinic | Administration' : 'Azaad Clinic | لوحة الإدارة';

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => translateNode(node, dict, reverse));
      translateAttributes(dict, reverse);

      if (window.AZAAD_ADMIN_ENGLISH_HARDENING?.run && state.language === 'en') {
        window.AZAAD_ADMIN_ENGLISH_HARDENING.run();
      }
      window.dispatchEvent(new CustomEvent('azaadLanguageChanged', { detail: { language: state.language } }));
      updateLanguageButtons();
    } finally {
      state.reapplying = false;
    }
  }

  function persistLanguage(lang) {
    state.language = lang === 'en' ? 'en' : 'ar';
    try {
      localStorage.setItem(LANG_KEY, state.language);
      localStorage.setItem(ADMIN_LANG_KEY, state.language);
    } catch (_) {}
    applyLanguage();
  }

  function updateLanguageButtons() {
    const host = $('azaadUnifiedLanguageSwitch');
    if (!host) return;
    host.querySelectorAll('[data-lang]').forEach(btn => {
      const active = btn.dataset.lang === state.language;
      btn.style.background = active ? '#17214f' : '#fff';
      btn.style.color = active ? '#fff' : '#17214f';
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function installLanguageControl() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || $('azaadUnifiedLanguageSwitch')) return;

    const style = document.createElement('style');
    style.id = 'azaadUnifiedLanguageStyles';
    style.textContent = `
      #azLang,#azaadCentralLanguageSwitch{display:none!important}
      #azaadUnifiedLanguageSwitch{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-inline-start:auto}
      #azaadUnifiedLanguageSwitch button{border:1px solid #d9deea;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer;min-width:92px}
      #azaadUnifiedLanguageSwitch button:focus-visible{outline:3px solid #b38a42;outline-offset:2px}
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'azaadUnifiedLanguageSwitch';
    wrap.setAttribute('aria-label', 'Language');
    wrap.innerHTML = `
      <button type="button" data-lang="ar">🇪🇬 العربية</button>
      <button type="button" data-lang="en">🇬🇧 English</button>
    `;
    wrap.querySelectorAll('[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => persistLanguage(btn.dataset.lang));
    });
    topbar.querySelector('.top-actions')?.prepend(wrap) || topbar.appendChild(wrap);
    updateLanguageButtons();
  }

  function phoneSearchButton(phone, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary azaad-phone-search';
    button.textContent = `🔎 ${t('بحث','Search')}`;
    button.title = t('البحث بهذا الرقم في ملفات المرضى والحجوزات','Search this phone in patient files and bookings');
    button.addEventListener('click', onClick);
    return button;
  }

  function enhancePatientCards() {
    const root = $('patientsPanel');
    if (!root) return;
    root.querySelectorAll('.patient-card').forEach(card => {
      if (card.querySelector('.azaad-phone-search')) return;
      const meta = card.querySelector('.patient-meta');
      if (!meta) return;
      const phoneNode = meta.querySelector('[dir="ltr"]');
      const phone = normalize(phoneNode?.textContent || '');
      if (!phone) return;
      const actions = card.querySelector('.patient-actions');
      if (!actions) return;
      actions.appendChild(phoneSearchButton(phone, () => {
        const input = $('patientSearchInput');
        if (input) {
          input.value = phone;
          input.dispatchEvent(new Event('input', { bubbles:true }));
          input.focus();
        }
        $('patientsTab')?.click();
      }));
    });
  }

  function enhanceFrontdesk() {
    const panel = $('frontdeskPanel');
    if (!panel || panel.dataset.azaadNextGen) return;
    panel.dataset.azaadNextGen = '1';

    const header = panel.querySelector('.fd-grid');
    if (header) {
      const extra = document.createElement('div');
      extra.className = 'fd-grid azaad-frontdesk-universal-search';
      extra.innerHTML = `
        <input id="fdUniversalSearch" type="search" placeholder="🔎 ${t('الاسم / الموبايل / MRN / رقم الحجز','Name / Phone / MRN / Booking Number')}">
        <input id="fdUniversalDate" type="date" value="${todayISO()}">
        <button id="fdUniversalSearchBtn" class="btn btn-secondary" type="button">🔎 ${t('بحث شامل','Universal Search')}</button>
      `;
      header.insertAdjacentElement('afterend', extra);
      $('fdUniversalSearchBtn').onclick = universalReceptionSearch;
      $('fdUniversalSearch').onkeydown = e => { if (e.key === 'Enter') universalReceptionSearch(); };
    }

    const observer = new MutationObserver(() => {
      panel.querySelectorAll('.fd-match').forEach(match => {
        if (match.querySelector('.azaad-phone-search')) return;
        const phone = normalize(match.querySelector('.muted')?.textContent || '').match(/(?:📱|Phone|الهاتف)\s*([^·]+)/i)?.[1]?.trim() || '';
        if (!phone) return;
        const actions = match.querySelector('.btn')?.parentElement || match;
        actions.appendChild(phoneSearchButton(phone, () => {
          const input = $('fdUniversalSearch');
          if (input) { input.value = phone; universalReceptionSearch(); }
        }));
      });
    });
    observer.observe(panel, { childList:true, subtree:true });
  }

  async function authFetch(url, options = {}) {
    const token = window.AZAAD?.state?.session?.access_token || '';
    if (!token) throw new Error(t('جلسة الإدارة غير موجودة أو منتهية.','The admin session is missing or expired.'));
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        Accept:'application/json',
        Authorization:`Bearer ${token}`,
        apikey:PUBLISHABLE_KEY,
        ...(options.body ? {'Content-Type':'application/json'} : {}),
        ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
    return body;
  }

  function bookingStatus(status) {
    const s = String(status || '').toLowerCase().replaceAll('-', '_');
    const labels = {
      pending: ['🟡 قيد المراجعة','🟡 Pending'],
      confirmed: ['🟢 مؤكد','🟢 Confirmed'],
      cancelled: ['❌ ملغي','❌ Cancelled'],
      completed: ['✅ مكتمل','✅ Completed'],
      no_show: ['🔴 لم يحضر','🔴 No-show'],
      rescheduled: ['🔄 أعيدت الجدولة','🔄 Rescheduled']
    };
    const x = labels[s] || [status || '—', status || '—'];
    return `<span class="badge ${s==='confirmed'?'confirmed':s==='cancelled'?'cancelled':s==='completed'?'completed':'pending'}">${esc(t(x[0],x[1]))}</span>`;
  }

  function enhanceBookings() {
    const panel = $('bookings');
    if (!panel || panel.dataset.azaadNextGen) return;
    panel.dataset.azaadNextGen = '1';

    const filters = panel.querySelector('.filters');
    const table = $('bookingTable');
    if (!filters || !table) return;

    const dateWrap = document.createElement('div');
    dateWrap.className = 'azaad-booking-nextgen-tools';
    dateWrap.innerHTML = `
      <label>${t('تاريخ الحجوزات','Booking date')}<input id="azaadBookingDate" type="date" value="${todayISO()}"></label>
      <button id="azaadBookingToday" class="btn btn-secondary" type="button">📅 ${t('اليوم','Today')}</button>
      <button id="azaadBookingSearch" class="btn btn-primary" type="button">🔎 ${t('بحث اليوم','Search date')}</button>
    `;
    filters.insertAdjacentElement('afterend', dateWrap);

    const info = document.createElement('div');
    info.id = 'azaadBookingDayInfo';
    info.className = 'muted';
    info.style.margin = '10px 0';
    table.insertAdjacentElement('beforebegin', info);

    $('azaadBookingDate').onchange = loadBookingDay;
    $('azaadBookingToday').onclick = () => { $('azaadBookingDate').value = todayISO(); loadBookingDay(); };
    $('azaadBookingSearch').onclick = loadBookingDay;

    const search = $('search');
    if (search) {
      search.placeholder = `🔎 ${t('الاسم / الموبايل / MRN / رقم الحجز','Name / Phone / MRN / Booking Number')}`;
      search.title = t('ابحث بالاسم أو الموبايل أو MRN أو رقم الحجز','Search by name, phone, MRN, or booking number');
      search.addEventListener('keydown', e => { if (e.key === 'Enter') loadBookingDay(); });
    }

    const status = $('statusFilter');
    status?.addEventListener('change', loadBookingDay);
    loadBookingDay();
  }

  async function loadBookingDay() {
    const table = $('bookingTable');
    const date = $('azaadBookingDate')?.value || todayISO();
    const search = normalize($('search')?.value || '');
    const status = String($('statusFilter')?.value || '');
    if (!table) return;

    const requestId = ++state.bookingRequest;
    table.innerHTML = `<div class="empty">⏳ ${t('جاري تحميل حجوزات التاريخ المحدد...','Loading bookings for the selected date...')}</div>`;
    try {
      const mrn = normalizeMRN(search);
      const params = new URLSearchParams({ from:date, to:date, limit:'500' });
      if (mrn) params.set('mrn', mrn); else if (search) params.set('q', search);
      const result = await authFetch(`${APPOINTMENTS_API}?${params.toString()}`);
      if (requestId !== state.bookingRequest) return;
      let rows = Array.isArray(result?.appointments) ? result.appointments : [];
      if (status) rows = rows.filter(x => String(x.status || '').toLowerCase().replaceAll('-','_') === status);

      const info = $('azaadBookingDayInfo');
      if (info) info.textContent = `📅 ${t('الحجوزات في','Bookings for')} ${date} — ${rows.length} ${t('موعد','appointment(s)')}`;
      if (!rows.length) {
        table.innerHTML = `<div class="empty">📭 ${t('لا توجد حجوزات مطابقة لهذا التاريخ والبحث.','No bookings match this date and search.')}</div>`;
        return;
      }
      table.innerHTML = `<div class="table-wrap"><table><thead><tr>
        <th>${t('الوقت','Time')}</th><th>${t('المريض','Patient')}</th><th>MRN</th><th>${t('الهاتف','Phone')}</th><th>${t('رقم الحجز','Booking')}</th><th>${t('الطبيب','Doctor')}</th><th>${t('الخدمة','Service')}</th><th>${t('الحالة','Status')}</th><th>${t('إجراء','Action')}</th>
      </tr></thead><tbody>${rows.map(x => `<tr>
        <td>${esc(String(x.appointment_time || '').slice(0,5) || '—')}</td>
        <td><strong>${esc(x.clinic_patients?.full_name || x.patient_name || '—')}</strong></td>
        <td dir="ltr">${esc(x.clinic_patients?.mrn || x.mrn || x.patient_mrn || '—')}</td>
        <td dir="ltr"><span>${esc(x.clinic_patients?.phone || x.patient_phone || '—')}</span></td>
        <td dir="ltr"><strong>${esc(x.booking_code || '—')}</strong></td>
        <td>${esc(x.clinic_doctors?.full_name || x.doctor_name || x.doctor || '—')}</td>
        <td>${esc(x.clinic_services?.name || x.service_name || x.service || '—')}</td>
        <td>${bookingStatus(x.status)}</td>
        <td><button class="btn btn-secondary" type="button" data-open-patient="${esc(x.patient_id || x.clinic_patients?.id || '')}">👤 ${t('فتح الملف','Open Patient')}</button></td>
      </tr>`).join('')}</tbody></table></div>`;
      table.querySelectorAll('[data-open-patient]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.openPatient;
          document.querySelector('[data-panel="patientsPanel"]')?.click();
          window.AZAAD_PATIENTS_CENTER?.openPatient?.(id);
          const fn = window.AZAAD_PATIENTS_CENTER?.open360;
          if (typeof fn === 'function') fn(id);
        };
      });
    } catch (error) {
      if (requestId !== state.bookingRequest) return;
      table.innerHTML = `<div class="error">❌ ${esc(error.message)}</div>`;
      const info = $('azaadBookingDayInfo');
      if (info) info.textContent = t('تعذر تحميل حجوزات التاريخ المحدد.','Unable to load bookings for the selected date.');
    }
  }

  async function universalReceptionSearch() {
    const q = normalize($('fdUniversalSearch')?.value || '');
    const date = $('fdUniversalDate')?.value || todayISO();
    const outputId = 'fdUniversalResults';
    let output = $(outputId);
    if (!output) {
      output = document.createElement('div');
      output.id = outputId;
      $('fdUniversalSearchBtn')?.closest('.azaad-frontdesk-universal-search')?.insertAdjacentElement('afterend', output);
    }
    output.innerHTML = `<div class="empty">⏳ ${t('جاري البحث...','Searching...')}</div>`;
    try {
      const mrn = normalizeMRN(q);
      const patientUrl = `${PATIENTS_API}?api=patients&search=${encodeURIComponent(mrn || q)}`;
      const patientResult = await authFetch(patientUrl);
      const patients = Array.isArray(patientResult?.patients) ? patientResult.patients : [];
      const params = new URLSearchParams({from:date,to:date,limit:'500'});
      if (mrn) params.set('mrn', mrn); else if (q) params.set('q', q);
      const bookingResult = await authFetch(`${APPOINTMENTS_API}?${params.toString()}`);
      const bookings = Array.isArray(bookingResult?.appointments) ? bookingResult.appointments : [];

      output.innerHTML = `<div class="card" style="margin-top:10px"><div class="panel-head"><h3>🔎 ${t('نتائج البحث الشامل','Universal Search Results')}</h3><span class="muted">${date}</span></div>${patients.length ? `<h4>👤 ${t('ملفات المرضى','Patient files')}</h4>${patients.slice(0,20).map(p=>`<div class="item"><div><b>${esc(p.patient_name || '—')}</b><div class="muted">🆔 ${esc(displayMRN(p.mrn))} · 📱 ${esc(p.patient_phone || '—')}</div></div><button class="btn btn-primary" data-fd-open="${esc(p.id)}">👤 ${t('فتح الملف','Open Patient')}</button></div>`).join('') : `<div class="empty">📭 ${t('لا توجد ملفات مطابقة.','No matching patient files.')}</div>`}${bookings.length ? `<h4 style="margin-top:14px">📅 ${t('حجوزات التاريخ','Date bookings')}</h4>${bookings.slice(0,50).map(x=>`<div class="item"><div><b>${esc(x.patient_name || x.clinic_patients?.full_name || '—')}</b><div class="muted">⏰ ${esc(String(x.appointment_time||'').slice(0,5))} · 🆔 ${esc(displayMRN(x.mrn || x.patient_mrn || x.clinic_patients?.mrn))} · 🔖 ${esc(x.booking_code || '—')}</div></div><span>${bookingStatus(x.status)}</span></div>`).join('') : `<div class="empty">📭 ${t('لا توجد حجوزات مطابقة في هذا التاريخ.','No matching bookings for this date.')}</div>`}</div>`;
      output.querySelectorAll('[data-fd-open]').forEach(b => b.onclick = () => {
        document.querySelector('[data-panel="patientsPanel"]')?.click();
        const id = b.dataset.fdOpen;
        const fn = window.AZAAD_PATIENTS_CENTER?.open360;
        if (typeof fn === 'function') fn(id);
      });
    } catch (error) {
      output.innerHTML = `<div class="error">❌ ${esc(error.message)}</div>`;
    }
  }

  function enhancePatientEmoji() {
    const style = document.createElement('style');
    style.id = 'azaadFriendlyPatientIcon';
    style.textContent = `.azaad-friendly-patient{display:inline-flex;align-items:center;justify-content:center;width:1.15em;height:1.15em;border-radius:50%;background:linear-gradient(135deg,#7ee787,#2ea043);font-size:.78em;vertical-align:-.08em;filter:saturate(1.08)}.azaad-friendly-patient::before{content:'☺';color:#fff;font-weight:900;font-size:.72em}`;
    if (!$('azaadFriendlyPatientIcon')) document.head.appendChild(style);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{if(!node.parentElement||/^(SCRIPT|STYLE)$/i.test(node.parentElement.tagName))return;const text=node.nodeValue;if(!text.includes('🤢'))return;const span=document.createElement('span');span.className='azaad-friendly-patient';span.setAttribute('aria-label',t('مريض','Patient'));span.title=t('مريض','Patient');span.textContent='';node.parentNode.replaceChild(span,node);});
  }

  function install() {
    if (!isAdmin() || state.installed) return;
    state.installed = true;
    state.language = language();
    installLanguageControl();
    enhanceBookings();
    enhanceFrontdesk();
    enhancePatientCards();
    enhancePatientEmoji();
    applyLanguage();

    const observer = new MutationObserver(() => {
      if (state.reapplying) return;
      installLanguageControl();
      enhanceBookings();
      enhanceFrontdesk();
      enhancePatientCards();
      enhancePatientEmoji();
      if (language() !== state.language) {
        state.language = language();
        applyLanguage();
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(install, 300), { once:true });
  else setTimeout(install, 300);
})();
