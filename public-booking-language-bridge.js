(() => {
  'use strict';
  const KEY = '__AZAAD_PUBLIC_BOOKING_LANGUAGE_BRIDGE_V1__';
  if (window[KEY]) return;
  window[KEY] = true;

  const language = () => {
    try {
      const saved = localStorage.getItem('azaadClinicLanguage');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    return String(document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  };
  const text = (item, ar, en) => {
    const value = language() === 'en' ? (item?.[en] ?? item?.[ar]) : (item?.[ar] ?? item?.[en]);
    return String(value ?? '').trim();
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function renderSelect(id, rows, type) {
    const select = document.getElementById(id);
    if (!select || !Array.isArray(rows)) return;
    const current = select.value;
    const placeholder = type === 'doctor'
      ? (language() === 'en' ? 'Select doctor' : 'اختر الطبيب')
      : (language() === 'en' ? 'Select service' : 'اختر الخدمة');
    const html = [`<option value="">${esc(placeholder)}</option>`];
    for (const item of rows) {
      const name = text(item, 'name', 'name_en');
      const title = type === 'doctor'
        ? text(item, 'title', 'title_en') || text(item, 'specialty', 'specialty_en')
        : '';
      const duration = type === 'service' && item?.duration_minutes
        ? ` — ${esc(item.duration_minutes)} ${language() === 'en' ? 'minutes' : 'دقيقة'}`
        : '';
      if (!item?.id || !name) continue;
      html.push(`<option value="${esc(item.id)}">${esc(name)}${title ? ` — ${esc(title)}` : ''}${duration}</option>`);
    }
    select.innerHTML = html.join('');
    if ([...select.options].some(o => o.value === current)) select.value = current;
  }

  function repair() {
    const data = window.AZAAD_PUBLIC_CLINIC_DATA;
    if (!data) return;
    renderSelect('doctor', data.doctors, 'doctor');
    renderSelect('service', data.services, 'service');

    const tagline = document.querySelector('.azaad-footer-tagline');
    if (tagline) {
      const ar = 'للصحة النفسية والعلاج النفسي';
      const en = 'Mental health and psychotherapy';
      if (language() === 'en' && (tagline.textContent.trim() === ar || !tagline.dataset.azaadLocalized)) tagline.textContent = en;
      if (language() === 'ar' && (tagline.textContent.trim() === en || tagline.dataset.azaadLocalized)) tagline.textContent = ar;
      tagline.dataset.azaadLocalized = language();
    }
  }

  const schedule = (() => {
    let timer = null;
    return () => { clearTimeout(timer); timer = setTimeout(repair, 0); };
  })();

  window.addEventListener('azaadPublicClinicDataReady', schedule);
  window.addEventListener('azaadPublicClinicDataChanged', schedule);
  window.addEventListener('azaadLanguageChanged', schedule);
  window.addEventListener('storage', event => {
    if (event.key === 'azaadClinicLanguage') schedule();
  });

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  [0, 200, 500, 1000, 2000, 4000].forEach(ms => setTimeout(repair, ms));
})();
