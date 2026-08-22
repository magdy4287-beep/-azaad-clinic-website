(() => {
  'use strict';

  const GATE_ID = 'azaadPatientBookingGate';
  const isEnglish = () => {
    try { return localStorage.getItem('azaadClinicLanguage') === 'en'; } catch (_) { return false; }
  };
  const t = (ar, en) => isEnglish() ? en : ar;

  function sanitize() {
    const gate = document.getElementById(GATE_ID);
    if (!gate) return;
    const card = gate.querySelector('.azaad-patient-card:not(.new)');
    if (!card) return;

    // The public lookup contract exposes only an opaque patient id.
    // Do not render MRN, patient name, phone, or appointment history.
    card.querySelector('.azaad-patient-meta')?.remove();
    card.querySelector('.azaad-upcoming')?.remove();

    const identity = card.firstElementChild;
    if (identity) identity.innerHTML = `<strong>🔐 ${t('ملفك موجود', 'Your file exists')}</strong>`;
  }

  function init() {
    sanitize();
    new MutationObserver(sanitize).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
