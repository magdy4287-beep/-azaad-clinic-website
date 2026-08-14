(() => {
  'use strict';

  /*
   * AZAAD CLINIC — BOOKING LANGUAGE FIX
   * v6.0.0
   *
   * app.js owns booking logic. This file only keeps dynamically
   * generated booking UI synchronized with the selected language.
   * It never changes booking payloads or security credentials.
   */

  const STATE_KEY = '__AZAAD_BOOKING_FIX_V6__';
  if (window[STATE_KEY]) return;

  const state = {
    applying: false,
    observer: null,
    timer: null,
    dataTimer: null,
    lastLanguage: '',
    lastDoctorSignature: '',
    lastServiceSignature: '',
    lastModeSignature: ''
  };
  window[STATE_KEY] = state;

  const DATA_KEY = 'AZAAD_PUBLIC_CLINIC_DATA';
  const LANGUAGE_KEY = 'azaadClinicLanguage';

  function language() {
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    const html = String(document.documentElement.lang || '').toLowerCase();
    return html === 'en' || html.startsWith('en-') ? 'en' : 'ar';
  }

  function english() {
    return language() === 'en';
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[ch]));
  }

  function data() {
    return window[DATA_KEY] || {};
  }

  function doctors() {
    return Array.isArray(data().doctors) ? data().doctors : [];
  }

  function services() {
    return Array.isArray(data().services) ? data().services : [];
  }

  function doctorName(d) {
    return english()
      ? (d?.name_en || d?.name || d?.full_name || d?.display_name || 'Doctor')
      : (d?.name || d?.full_name || d?.display_name || 'طبيب');
  }

  function doctorTitle(d) {
    return english()
      ? (d?.title_en || d?.title || d?.specialty || d?.specialization || 'Mental health specialist')
      : (d?.title || d?.specialty || d?.specialization || 'متخصص في الصحة النفسية');
  }

  function doctorBio(d) {
    return english()
      ? (d?.bio_en || d?.bio || d?.description || d?.short_bio || 'Mental health specialist working with you toward a more balanced life.')
      : (d?.bio || d?.description || d?.short_bio || 'متخصص يعمل معك للوصول إلى حياة أكثر توازنًا.');
  }

  function serviceName(s) {
    return english()
      ? (s?.name_en || s?.name || s?.title || s?.service_name || 'Mental health service')
      : (s?.name || s?.title || s?.service_name || 'خدمة نفسية');
  }

  function serviceDescription(s) {
    return english()
      ? (s?.description_en || s?.description || s?.short_description || s?.details || 'Mental health service designed around your needs.')
      : (s?.description || s?.short_description || s?.details || 'خدمة نفسية مصممة لتناسب احتياجاتك.');
  }

  function updateDoctorSelect() {
    if (!english()) return;
    const select = document.getElementById('doctor');
    const list = doctors();
    if (!select || !list.length) return;

    const signature = list.map(d => `${d.id}|${doctorName(d)}|${doctorTitle(d)}`).join('||');
    if (signature === state.lastDoctorSignature && select.options.length === list.length + 1) return;

    const selected = select.value;
    state.lastDoctorSignature = signature;

    select.innerHTML = `<option value="">Select doctor</option>` + list.map(d => `
      <option value="${esc(d.id)}">
        ${esc(doctorName(d))}${doctorTitle(d) ? ` — ${esc(doctorTitle(d))}` : ''}
      </option>`).join('');

    if ([...select.options].some(o => o.value === selected)) select.value = selected;
  }

  function updateServiceSelect() {
    if (!english()) return;
    const select = document.getElementById('service');
    const list = services();
    if (!select || !list.length) return;

    const signature = list.map(s => `${s.id}|${serviceName(s)}|${s.duration_minutes ?? s.duration ?? ''}`).join('||');
    if (signature === state.lastServiceSignature && select.options.length === list.length + 1) return;

    const selected = select.value;
    state.lastServiceSignature = signature;

    select.innerHTML = `<option value="">Select service</option>` + list.map(s => {
      const duration = Number(s?.duration_minutes ?? s?.duration ?? 0);
      return `<option value="${esc(s.id)}">${esc(serviceName(s))}${duration ? ` — ${duration} minutes` : ''}</option>`;
    }).join('');

    if ([...select.options].some(o => o.value === selected)) select.value = selected;
  }

  function updateModeSelect() {
    if (!english()) return;
    const select = document.getElementById('mode');
    if (!select) return;
    const signature = `${select.value}|${select.options.length}`;
    if (signature === state.lastModeSignature) return;
    state.lastModeSignature = signature;
    const clinic = select.querySelector('option[value="clinic"]');
    const online = select.querySelector('option[value="online"]');
    if (clinic) clinic.textContent = 'In-clinic';
    if (online) online.textContent = 'Online session';
  }

  function updateCards() {
    if (!english()) return;
    const ds = doctors();
    const ss = services();

    document.querySelectorAll('#doctorsGrid .clinic-doctor-card').forEach((card, i) => {
      const d = ds[i];
      if (!d) return;
      const h = card.querySelector('h3');
      if (h) h.textContent = doctorName(d);
      const title = card.querySelector('h3 + div');
      if (title) title.textContent = `🧑‍⚕️ ${doctorTitle(d)}`;
      const ps = card.querySelectorAll('p');
      if (ps.length) ps[ps.length - 1].textContent = doctorBio(d);
      const img = card.querySelector('img');
      if (img) img.alt = doctorName(d);
    });

    document.querySelectorAll('#servicesGrid .clinic-service-card').forEach((card, i) => {
      const s = ss[i];
      if (!s) return;
      const h = card.querySelector('h3');
      if (h) h.textContent = serviceName(s);
      const p = card.querySelector('p');
      if (p) p.textContent = serviceDescription(s);
      const duration = Number(s?.duration_minutes ?? s?.duration ?? 0);
      const note = card.querySelector('.small-note');
      if (note && duration) note.textContent = `⏱️ ${duration} minutes`;
    });
  }

  function translateKnownDynamicText() {
    if (!english()) return;
    const exact = new Map([
      ['اختر الطبيب', 'Select doctor'],
      ['اختر الخدمة', 'Select service'],
      ['اختر التاريخ', 'Select date'],
      ['اختر الوقت', 'Select time'],
      ['جاري التحميل...', 'Loading...'],
      ['جاري تحميل المواعيد...', 'Loading appointments...'],
      ['لا توجد مواعيد متاحة لهذا اليوم.', 'No appointments are available for this day.'],
      ['اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.', 'Select a doctor, service, date, and session type to view available appointments.'],
      ['تم تسجيل طلب الحجز.', 'The booking request has been registered.'],
      ['تعذر تحميل المواعيد. يرجى المحاولة مرة أخرى.', 'Unable to load appointments. Please try again.']
    ]);

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (!node.parentElement || node.parentElement.closest('script,style,input,textarea,select,option')) return;
      const value = String(node.nodeValue || '').trim();
      const translated = exact.get(value);
      if (!translated) return;
      node.nodeValue = node.nodeValue.replace(value, translated);
    });
  }

  function apply() {
    if (state.applying) return;
    state.applying = true;
    try {
      const lang = language();
      if (lang !== state.lastLanguage) {
        state.lastLanguage = lang;
        state.lastDoctorSignature = '';
        state.lastServiceSignature = '';
        state.lastModeSignature = '';
      }
      if (english()) {
        updateDoctorSelect();
        updateServiceSelect();
        updateModeSelect();
        updateCards();
        translateKnownDynamicText();
      }
    } finally {
      state.applying = false;
    }
  }

  function schedule() {
    if (state.timer) return;
    state.timer = setTimeout(() => {
      state.timer = null;
      apply();
    }, 30);
  }

  function startDataPolling() {
    if (state.dataTimer) return;
    state.dataTimer = setInterval(() => {
      if (doctors().length || services().length) apply();
    }, 300);
  }

  function init() {
    apply();
    startDataPolling();

    try {
      state.observer = new MutationObserver(() => schedule());
      state.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (_) {}

    window.addEventListener('storage', event => {
      if (event.key === LANGUAGE_KEY) {
        state.lastLanguage = '';
        schedule();
      }
    });

    document.documentElement.addEventListener?.('langchange', schedule);

    setInterval(() => {
      const current = language();
      if (current !== state.lastLanguage) schedule();
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
