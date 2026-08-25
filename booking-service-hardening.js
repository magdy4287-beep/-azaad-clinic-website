/* AZAAD CLINIC — CENTRAL BOOKING SERVICE PRESENTATION HARDENING
 * Keeps the patient service selector readable and prevents raw i18n/debug
 * tokens such as "serviceMinutes" from reaching the UI.
 * Scheduling eligibility remains owned by the canonical database/API.
 */
(() => {
  'use strict';

  if (window.__AZAAD_BOOKING_SERVICE_HARDENING__) return;
  window.__AZAAD_BOOKING_SERVICE_HARDENING__ = true;

  const language = () => {
    try {
      const saved = localStorage.getItem('azaadClinicLanguage');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    return String(document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'ar';
  };

  const cleanOption = (option) => {
    if (!option || !option.value) return;
    const text = String(option.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;

    const lang = language();
    let cleaned = text
      .replace(/\s*serviceMinutes\s*/gi, ' ')
      .replace(/\s+-\s*$/g, '')
      .replace(/^\s*-\s*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // If the source accidentally emitted the duration token separately,
    // retain only the numeric duration and attach the canonical unit.
    cleaned = cleaned.replace(/\b(\d{1,3})\s*$/g, (_, minutes) =>
      `${minutes} ${lang === 'en' ? 'minutes' : 'دقيقة'}`
    );

    option.textContent = cleaned;
  };

  const normalize = () => {
    const select = document.getElementById('service');
    if (!select) return false;
    [...select.options].forEach(cleanOption);
    return true;
  };

  const boot = () => {
    if (!normalize()) return false;
    const select = document.getElementById('service');
    if (!select || select.dataset.azaadServiceHardening === '1') return true;
    select.dataset.azaadServiceHardening = '1';

    try {
      const observer = new MutationObserver(() => normalize());
      observer.observe(select, { childList: true, subtree: true });
      select.addEventListener('change', () => setTimeout(normalize, 0));
      window.addEventListener('azaad:language-changed', () => setTimeout(normalize, 0));
    } catch (_) {}
    return true;
  };

  const timer = setInterval(() => {
    if (boot()) clearInterval(timer);
  }, 100);
  setTimeout(() => clearInterval(timer), 15000);
})();
