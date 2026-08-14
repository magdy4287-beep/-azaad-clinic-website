/*
 * AZAAD CLINIC — Patient MRN usability layer
 *
 * Internal MRN remains unchanged in Supabase (example: AZA-000001).
 * Admin users see/search it as: Patient 00001.
 *
 * Free-first, frontend-only presentation/search adapter.
 * No database migration and no change to the canonical MRN value.
 */
(() => {
  'use strict';

  const PATIENT_API = '/functions/v1/azaad-patients';
  const DISPLAY_SELECTOR = '#patientsPanel, #modalContent';

  function toCanonical(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return raw;

    const compact = raw.replace(/\s+/g, '').toUpperCase();
    const prefixed = compact.match(/^AZA-?(\d+)$/);
    if (prefixed) return `AZA-${prefixed[1].padStart(6, '0')}`;

    if (/^\d{1,6}$/.test(compact)) {
      return `AZA-${compact.padStart(6, '0')}`;
    }

    return raw;
  }

  function toDisplay(value) {
    const raw = String(value ?? '');
    const match = raw.match(/\bAZA-(\d{1,})\b/i);
    if (!match) return raw;

    const n = Number(match[1]);
    if (!Number.isFinite(n)) return raw;

    // AZA-000001 -> Patient 00001; keep at least five digits for easy use.
    const visible = String(n).padStart(5, '0');
    return raw.replace(match[0], `Patient ${visible}`);
  }

  function hide360Text(value) {
    return String(value ?? '').replace(/Patient\s*360(?:°)?/gi, 'Patient');
  }

  function formatTextNode(node) {
    if (!node || !node.nodeValue) return;
    const parent = node.parentElement;
    if (!parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/i.test(parent.tagName)) return;
    if (!parent.closest(DISPLAY_SELECTOR)) return;

    const next = hide360Text(toDisplay(node.nodeValue));
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function formatVisibleMrns(root = document) {
    const scope = root.querySelectorAll ? root : document;
    const walker = document.createTreeWalker(
      scope,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return node.parentElement?.closest(DISPLAY_SELECTOR)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(formatTextNode);
  }

  function normalizeSearchBeforeExistingHandler(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (!['patientSearchInput', 'bookingSearch'].includes(input.id)) return;

    const canonical = toCanonical(input.value);
    if (canonical === input.value || !/^AZA-\d{6}$/i.test(canonical)) return;

    // patients-center.js reads event.target.value synchronously. Give it the
    // canonical value, then restore the friendly value immediately after the event.
    const friendly = input.value;
    input.value = canonical;
    queueMicrotask(() => {
      if (document.activeElement === input || input.value === canonical) {
        input.value = friendly;
      }
    });
  }

  function patchFetch() {
    if (window.__AZAAD_MRN_FETCH_PATCHED__) return;
    const originalFetch = window.fetch.bind(window);

    window.fetch = (input, init) => {
      try {
        const originalUrl = typeof input === 'string' ? input : input?.url;
        if (originalUrl && originalUrl.includes(PATIENT_API)) {
          const url = new URL(originalUrl, window.location.href);
          const api = url.searchParams.get('api');
          const search = url.searchParams.get('search');
          if (api === 'patients' && search && !/^(?:AZA-?)?\d+$/i.test(search) === false) {
            const canonical = toCanonical(search);
            if (/^AZA-\d{6}$/i.test(canonical)) {
              url.searchParams.set('search', canonical);
              if (typeof input === 'string') input = url.toString();
              else input = new Request(url.toString(), input);
            }
          }
        }
      } catch (_) {
        // Never block the clinic UI because of a presentation adapter.
      }
      return originalFetch(input, init);
    };

    window.__AZAAD_MRN_FETCH_PATCHED__ = true;
  }

  function boot() {
    patchFetch();

    document.addEventListener('input', normalizeSearchBeforeExistingHandler, true);
    document.addEventListener('change', normalizeSearchBeforeExistingHandler, true);

    formatVisibleMrns();
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes?.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) formatTextNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) formatVisibleMrns(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
