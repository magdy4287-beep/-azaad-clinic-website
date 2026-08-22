/* AZAAD CLINIC — ADMIN BUSINESS HARDENING
 * Canonical i18n owns all language, translation, and RTL/LTR work.
 * This module keeps only non-i18n patient/MRN/search hardening.
 */
(() => {
  'use strict';

  const M = {
    toCanonical(value) {
      const raw = String(value ?? '').trim();
      if (!raw) return raw;
      const compact = raw.replace(/\s+/g, '').toUpperCase();
      const prefixed = compact.match(/^AZA-?(\d+)$/);
      if (prefixed) return `AZA-${prefixed[1].padStart(6, '0')}`;
      if (/^\d{1,6}$/.test(compact)) return `AZA-${compact.padStart(6, '0')}`;
      return raw;
    },

    toDisplay(value) {
      return String(value ?? '').replace(/\bAZA-(\d{1,})\b/gi, (_, digits) =>
        `Patient ${String(Number(digits)).padStart(5, '0')}`
      );
    },

    formatPatientText(node) {
      if (!node?.nodeValue) return;
      const parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/i.test(parent.tagName)) return;
      if (!parent.closest('#patientsPanel,#modalContent')) return;
      let next = node.nodeValue.replace(/Patient\s*360(?:°)?/gi, 'Patient');
      next = M.toDisplay(next);
      if (next !== node.nodeValue) node.nodeValue = next;
    },

    formatPatientArea() {
      document.querySelectorAll('#patientsPanel,#modalContent').forEach(root => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(M.formatPatientText);
      });
    },

    normalizePatientSearch(event) {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (!['patientSearchInput', 'bookingSearch', 'search'].includes(input.id)) return;
      const canonical = M.toCanonical(input.value);
      if (canonical !== input.value && /^AZA-\d{6}$/i.test(canonical)) {
        input.dataset.canonicalPatientSearch = canonical;
      }
    },

    patchPatientFetch() {
      if (window.__AZAAD_PATIENT_MRN_FETCH_PATCHED__) return;
      const original = window.fetch.bind(window);
      window.fetch = (input, init) => {
        try {
          const originalUrl = typeof input === 'string' ? input : input?.url;
          if (originalUrl && originalUrl.includes('/functions/v1/azaad-patients')) {
            const url = new URL(originalUrl, location.href);
            if (url.searchParams.get('api') === 'patients') {
              const search = url.searchParams.get('search');
              if (search && /^(?:AZA-?)?\d+$/i.test(search)) {
                const canonical = M.toCanonical(search);
                if (/^AZA-\d{6}$/i.test(canonical)) {
                  url.searchParams.set('search', canonical);
                  input = typeof input === 'string'
                    ? url.toString()
                    : new Request(url.toString(), input);
                }
              }
            }
          }
        } catch (_) {}
        return original(input, init);
      };
      window.__AZAAD_PATIENT_MRN_FETCH_PATCHED__ = true;
    },

    patchMainSearch() {
      const input = document.getElementById('search');
      if (!input) return;
      input.placeholder = '🔎 Name / Phone / Patient Number / Booking Number';
      input.title = 'Search by name, phone, Patient Number (e.g. 00001), or Booking Number';
    },

    run() {
      M.formatPatientArea();
      M.patchMainSearch();
    }
  };

  function start() {
    M.patchPatientFetch();
    document.addEventListener('input', M.normalizePatientSearch, true);
    document.addEventListener('change', M.normalizePatientSearch, true);
    M.run();
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  window.AZAAD_ADMIN_ENGLISH_HARDENING = {
    run: M.run,
    toCanonical: M.toCanonical,
    toDisplay: M.toDisplay
  };
})();
