(() => {
  'use strict';

  const API = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-patient-lookup';
  const LANG_KEY = 'azaadClinicLanguage';
  const STATE_KEY = '__AZAAD_PATIENT_BOOKING_GATE_V1__';
  if (window[STATE_KEY]) return;

  const state = window[STATE_KEY] = {
    mode: 'locked',
    patient: null,
    phone: '',
    lookupInFlight: false,
  };

  const $ = (id) => document.getElementById(id);
  const isEnglish = () => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'ar') return saved === 'en';
    } catch (_) {}
    return String(document.documentElement.lang || '').toLowerCase().startsWith('en');
  };
  const t = (ar, en) => isEnglish() ? en : ar;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function normalizePhone(v) {
    return String(v || '').replace(/\D/g, '');
  }

  function validPhone(v) {
    const d = normalizePhone(v);
    return d.length >= 8 && d.length <= 15;
  }

  function injectStyles() {
    if ($('azaadPatientBookingGateStyles')) return;
    const style = document.createElement('style');
    style.id = 'azaadPatientBookingGateStyles';
    style.textContent = `
      #azaadPatientBookingGate{margin:0 0 22px;padding:22px;border:1px solid #d8e0f1;border-radius:18px;background:linear-gradient(180deg,#fff,#f8faff);box-shadow:0 8px 28px rgba(16,27,86,.06)}
      #azaadPatientBookingGate h3{margin:0 0 8px;color:#101b56;font-size:22px}
      #azaadPatientBookingGate p{margin:0 0 14px;line-height:1.8;color:#66728e}
      .azaad-gate-row{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch}
      .azaad-gate-row input{flex:1 1 240px;min-width:0;border:1px solid #d8e0f1;border-radius:12px;padding:14px 15px;font-size:17px;direction:ltr;text-align:left;background:#fff}
      .azaad-gate-btn{border:0;border-radius:12px;padding:14px 18px;font-weight:700;cursor:pointer;background:#101b56;color:#fff;min-width:150px}
      .azaad-gate-btn.secondary{background:#eef2fb;color:#101b56;border:1px solid #d8e0f1}
      .azaad-gate-btn:disabled{opacity:.55;cursor:not-allowed}
      .azaad-gate-result{margin-top:14px}
      .azaad-patient-card{border:1px solid #cfe6d9;background:#f3fbf6;border-radius:15px;padding:16px}
      .azaad-patient-card.new{border-color:#ead9a6;background:#fffaf0}
      .azaad-patient-card strong{color:#101b56}
      .azaad-patient-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:12px 0}
      .azaad-patient-meta span{background:#fff;border:1px solid #e3e8f3;border-radius:10px;padding:9px;line-height:1.5}
      .azaad-gate-status{margin-top:10px;font-weight:700;line-height:1.7}
      .azaad-lock-note{margin-top:12px;padding:11px 13px;border-radius:10px;background:#fff3f3;color:#8c3131;border:1px solid #f1d0d0}
      .azaad-upcoming{margin-top:10px;font-size:14px;line-height:1.7;color:#55617a}
      #bookingForm[data-patient-gate="locked"] .form-grid{opacity:.45;pointer-events:none;filter:saturate(.55)}
      #bookingForm[data-patient-gate="locked"] .booking-submit{opacity:.45;pointer-events:none}
      @media(max-width:600px){#azaadPatientBookingGate{padding:16px}.azaad-gate-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function formFields() {
    const form = $('bookingForm');
    if (!form) return [];
    return [...form.querySelectorAll('input,select,textarea,button')];
  }

  function setFormLocked(locked) {
    const form = $('bookingForm');
    if (!form) return;
    form.dataset.patientGate = locked ? 'locked' : 'ready';
    for (const el of formFields()) {
      if (el.id === 'phone') continue;
      if (el.closest('#message')) continue;
      el.disabled = locked;
    }
    const phone = $('phone');
    if (phone) {
      phone.value = state.phone || '';
      phone.readOnly = true;
      phone.setAttribute('aria-readonly','true');
    }
  }

  function ensureHiddenPatientId() {
    const form = $('bookingForm');
    if (!form) return;
    let hidden = $('patient_id');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = 'patient_id';
      hidden.name = 'patient_id';
      form.appendChild(hidden);
    }
    hidden.value = state.patient?.id || '';
  }

  function renderGate() {
    const form = $('bookingForm');
    if (!form) return;
    let gate = $('azaadPatientBookingGate');
    if (!gate) {
      gate = document.createElement('div');
      gate.id = 'azaadPatientBookingGate';
      form.parentNode?.insertBefore(gate, form);
    }

    const found = state.patient;
    if (found) {
      const upcoming = Array.isArray(found.upcoming_bookings) ? found.upcoming_bookings : [];
      gate.innerHTML = `
        <h3>👤 ${t('ملف المريض','Patient file')}</h3>
        <p>${t('تم العثور على ملف مرتبط بهذا الرقم. استخدم نفس الملف حتى لا يتم إنشاء ملف مكرر.','A patient file already exists for this phone number. Reuse it to prevent duplicate files.')}</p>
        <div class="azaad-patient-card">
          <div><strong>${esc(found.patient_name || '—')}</strong></div>
          <div class="azaad-patient-meta">
            <span>🆔 <strong>MRN:</strong> ${esc(found.mrn || '—')}</span>
            <span>📱 <strong>${t('الهاتف','Phone')}:</strong> ${esc(found.patient_phone || state.phone)}</span>
          </div>
          ${upcoming.length ? `<div class="azaad-upcoming">📅 ${t('مواعيد قادمة','Upcoming appointments')}: ${upcoming.map(x => `${esc(x.appointment_date || '')} ${esc(String(x.appointment_time || '').slice(0,5))}`).join(' • ')}</div>` : ''}
          <button type="button" id="azaadUseExistingPatient" class="azaad-gate-btn">✅ ${t('متابعة الحجز بهذا الملف','Continue with this patient file')}</button>
        </div>`;
      $('azaadUseExistingPatient').onclick = () => {
        state.mode = 'existing';
        state.patient = found;
        ensureHiddenPatientId();
        const name = $('name');
        if (name) { name.value = found.patient_name || ''; name.readOnly = true; }
        setFormLocked(false);
        if ($('phone')) $('phone').value = state.phone;
        const status = document.createElement('div');
        status.className = 'azaad-gate-status';
        status.textContent = t('تم اختيار الملف. يمكنك الآن اختيار الطبيب والخدمة والموعد.','Patient file selected. You can now choose the doctor, service, and appointment.');
        gate.querySelector('.azaad-patient-card')?.appendChild(status);
      };
      return;
    }

    gate.innerHTML = `
      <h3>📱 ${t('ابدأ برقم الموبايل','Start with your mobile number')}</h3>
      <p>${t('يجب البحث برقم الموبايل أولًا للتأكد من وجود ملف للمريض قبل اختيار الموعد.','Mobile-number lookup is required before choosing an appointment so we can prevent duplicate patient files.')}</p>
      <div class="azaad-gate-row">
        <input id="azaadPatientLookupPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="${t('رقم الموبايل','Mobile number')}" aria-label="${t('رقم الموبايل','Mobile number')}">
        <button type="button" id="azaadPatientLookupButton" class="azaad-gate-btn">🔎 ${t('بحث عن الملف','Find patient file')}</button>
      </div>
      <div id="azaadPatientLookupResult" class="azaad-gate-result"></div>`;
    const input = $('azaadPatientLookupPhone');
    if (input) input.value = state.phone || '';
    $('azaadPatientLookupButton').onclick = lookup;
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } });
  }

  async function lookup() {
    if (state.lookupInFlight) return;
    const input = $('azaadPatientLookupPhone');
    const phone = String(input?.value || '').trim();
    const result = $('azaadPatientLookupResult');
    if (!validPhone(phone)) {
      if (result) result.innerHTML = `<div class="azaad-lock-note">❌ ${t('أدخل رقم موبايل صحيح ثم اضغط بحث.','Enter a valid mobile number and press Find.')}</div>`;
      return;
    }
    state.lookupInFlight = true;
    state.phone = phone;
    const btn = $('azaadPatientLookupButton');
    if (btn) { btn.disabled = true; btn.textContent = `⏳ ${t('جاري البحث...','Searching...')}`; }
    if (result) result.innerHTML = `<div class="azaad-gate-status">⏳ ${t('جاري التحقق من ملف المريض...','Checking the patient file...')}</div>`;
    try {
      const response = await fetch(`${API}?phone=${encodeURIComponent(phone)}&_=${Date.now()}`, { cache:'no-store', headers:{Accept:'application/json'} });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || t('تعذر البحث عن الملف.','Unable to search for the patient file.'));
      if (body.found && body.patient) {
        state.patient = body.patient;
        state.mode = 'found';
        state.patient.upcoming_bookings = body.upcoming_bookings || [];
        renderGate();
        setFormLocked(true);
        ensureHiddenPatientId();
        return;
      }
      state.patient = null;
      state.mode = 'new-pending';
      renderGate();
      const gateResult = $('azaadPatientBookingGate')?.querySelector('.azaad-gate-result');
      if (gateResult) {
        gateResult.innerHTML = `<div class="azaad-patient-card new"><strong>🆕 ${t('لم يتم العثور على ملف بهذا الرقم.','No patient file was found for this number.')}</strong><p>${t('يمكنك الآن إنشاء ملف جديد مرة واحدة ثم إكمال الحجز.','You can now create one new patient file and continue with the booking.')}</p><button type="button" id="azaadCreateNewPatient" class="azaad-gate-btn">➕ ${t('اختيار ملف جديد','Create new patient file')}</button></div>`;
        $('azaadCreateNewPatient').onclick = () => {
          state.mode = 'new';
          ensureHiddenPatientId();
          setFormLocked(false);
          const name = $('name');
          if (name) { name.readOnly = false; name.value = ''; name.focus(); }
          const phoneField = $('phone');
          if (phoneField) phoneField.value = state.phone;
          gateResult.innerHTML = `<div class="azaad-gate-status">🆕 ${t('تم فتح نموذج المريض الجديد. أكمل بياناتك ثم اختر الموعد.','New patient flow is open. Complete your details, then choose the appointment.')}</div>`;
        };
      }
    } catch (error) {
      state.mode = 'locked';
      state.patient = null;
      const message = error?.message || t('تعذر البحث عن الملف.','Unable to search for the patient file.');
      if (result) result.innerHTML = `<div class="azaad-lock-note">❌ ${esc(message)}</div>`;
    } finally {
      state.lookupInFlight = false;
      const button = $('azaadPatientLookupButton');
      if (button) { button.disabled = false; button.textContent = `🔎 ${t('بحث عن الملف','Find patient file')}`; }
    }
  }

  function guardSubmit(event) {
    if (state.mode !== 'existing' && state.mode !== 'new') {
      event.preventDefault();
      event.stopImmediatePropagation();
      const gate = $('azaadPatientBookingGate');
      gate?.scrollIntoView({behavior:'smooth', block:'center'});
      const result = $('azaadPatientLookupResult');
      if (result) result.innerHTML = `<div class="azaad-lock-note">🔒 ${t('ابدأ بالبحث عن رقم الموبايل أولًا. لا يمكن إنشاء حجز قبل التحقق من ملف المريض.','Start by searching the mobile number. A booking cannot be created before the patient file is verified.')}</div>`;
      return false;
    }
    ensureHiddenPatientId();
    const phone = $('phone');
    if (phone) phone.value = state.phone;
    if (state.mode === 'existing' && state.patient) {
      const name = $('name');
      if (name) name.value = state.patient.patient_name || '';
    }
    return true;
  }

  function patchFetchWithPatientContext() {
    if (window.__AZAAD_PATIENT_FETCH_PATCH__) return;
    window.__AZAAD_PATIENT_FETCH_PATCH__ = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      try {
        const url = typeof input === 'string' ? input : input?.url || '';
        if (url.includes('/functions/v1/azaad-clinic?api=book') && state.patient?.id) {
          const nextInit = {...init};
          const rawBody = nextInit.body;
          if (typeof rawBody === 'string') {
            const payload = JSON.parse(rawBody);
            payload.patient_id = state.patient.id;
            payload.patient_mrn = state.patient.mrn;
            nextInit.body = JSON.stringify(payload);
          }
          return originalFetch(input, nextInit);
        }
      } catch (_) {}
      return originalFetch(input, init);
    };
  }

  function init() {
    injectStyles();
    const form = $('bookingForm');
    if (!form) return;
    renderGate();
    setFormLocked(true);
    form.addEventListener('submit', guardSubmit, true);
    patchFetchWithPatientContext();
    window.addEventListener('storage', e => { if (e.key === LANG_KEY) renderGate(); });
    setInterval(() => {
      const phone = $('phone');
      if (phone && state.phone) phone.value = state.phone;
      if (state.mode === 'locked' && form.dataset.patientGate !== 'locked') setFormLocked(true);
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
