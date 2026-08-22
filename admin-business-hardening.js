'use strict';

/* AZAAD — Admin business hardening only.
 *
 * This module intentionally contains no locale state, translation dictionary,
 * language button handler, MutationObserver for translation, or DOM-wide text
 * rewriting. Language ownership belongs exclusively to central-i18n.js.
 */
(() => {
  const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  const normalizeMRN = (value) => {
    const raw = normalize(value).toUpperCase();
    if (/^AZA-\d{6}$/.test(raw)) return raw;
    if (/^AZA\d{6}$/.test(raw)) return `AZA-${raw.slice(3)}`;
    if (/^\d{1,6}$/.test(raw)) return `AZA-${raw.padStart(6, '0')}`;
    return '';
  };

  const displayMRN = (value) => {
    const mrn = normalizeMRN(value);
    return mrn ? `Patient ${mrn.slice(4)}` : (value || '—');
  };

  // Keep business helpers available without creating a second i18n runtime.
  window.AZAAD_ADMIN_BUSINESS = Object.assign(window.AZAAD_ADMIN_BUSINESS || {}, {
    normalizeMRN,
    displayMRN,
  });
})();
