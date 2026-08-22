(() => {
  'use strict';

  const GATE_ID = 'azaadPatientBookingGate';
  const SANITIZED_ATTR = 'data-azaad-privacy-sanitized';
  const isEnglish = () => {
    try { return localStorage.getItem('azaadClinicLanguage') === 'en'; } catch (_) { return false; }
  };
  const t = (ar, en) => isEnglish() ? en : ar;

  function sanitize() {
    const gate = document.getElementById(GATE_ID);
    if (!gate) return;
    const card = gate.querySelector('.azaad-patient-card:not(.new)');
    if (!card || card.getAttribute(SANITIZED_ATTR) === 'true') return;

    // The public lookup contract exposes only an opaque patient id.
    // Do not render MRN, patient name, phone, or appointment history.
    card.querySelector('.azaad-patient-meta')?.remove();
    card.querySelector('.azaad-upcoming')?.remove();

    const identity = card.firstElementChild;
    if (identity) {
      const safeText = `🔐 ${t('ملفك موجود', 'Your file exists')}`;
      if (identity.textContent?.trim() !== safeText) {
        identity.textContent = '';
        const strong = document.createElement('strong');
        strong.textContent = safeText;
        identity.appendChild(strong);
      }
    }

    card.setAttribute(SANITIZED_ATTR, 'true');
  }

  function init() {
    sanitize();
    const observer = new MutationObserver(() => sanitize());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
