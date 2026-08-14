/* AZAAD Patient MRN Display V2
   User-facing format: Patient 00001
   Canonical backend MRN remains: AZA-000001
   Free-first, display-only layer; never mutates the database MRN.
*/
(() => {
  'use strict';

  const toDisplay = (value) => {
    const raw = String(value ?? '').trim().toUpperCase();
    const m = raw.match(/^AZA-?(\d{6})$/) || raw.match(/^(\d{6})$/);
    if (!m) return null;
    return `Patient ${m[1].slice(-5)}`;
  };

  const rewrite = (root = document) => {
    const nodes = root.querySelectorAll?.('.patient-mrn, [data-mrn], [data-patient-mrn]') || [];
    nodes.forEach((node) => {
      const source = node.getAttribute('data-mrn') || node.getAttribute('data-patient-mrn') || node.textContent || '';
      const match = String(source).match(/AZA-?\d{6}|\b\d{6}\b/);
      if (!match) return;
      const display = toDisplay(match[0]);
      if (!display) return;
      if (node.getAttribute('data-mrn')) node.setAttribute('aria-label', display);
      node.textContent = `🆔 ${display}`;
    });
  };

  const boot = () => {
    rewrite();
    const observer = new MutationObserver(() => rewrite());
    observer.observe(document.body, { childList: true, subtree: true });
    window.AZAAD_PATIENT_MRN_DISPLAY = { toDisplay, rewrite };
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
