/* AZAAD CLINIC — CENTRAL I18N STABILITY PATCH
 * Loaded before central-i18n.js. Prevents language switching from reloading
 * the dashboard and removes the central runtime's polling timer after boot.
 */
(() => {
  'use strict';
  if (window.__AZAAD_I18N_STABILITY__) return;
  window.__AZAAD_I18N_STABILITY__ = true;

  const STORAGE = 'azaadClinicLanguage';
  const ADMIN_STORAGE = 'azaad_admin_lang';
  const trackedIntervals = new Set();
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  let tracking = true;

  window.setInterval = function (handler, timeout, ...args) {
    const id = nativeSetInterval(handler, timeout, ...args);
    if (tracking && Number(timeout) >= 900 && Number(timeout) <= 1100) trackedIntervals.add(id);
    return id;
  };

  function currentLanguage() {
    try {
      const admin = localStorage.getItem(ADMIN_STORAGE);
      if (location.pathname.endsWith('/admin.html') && (admin === 'en' || admin === 'ar')) return admin;
      const saved = localStorage.getItem(STORAGE);
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    return document.documentElement.lang === 'en' ? 'en' : 'ar';
  }

  function persist(lang) {
    try {
      localStorage.setItem(STORAGE, lang);
      if (location.pathname.endsWith('/admin.html')) localStorage.setItem(ADMIN_STORAGE, lang);
    } catch (_) {}
  }

  function bindLanguageButtons() {
    document.querySelectorAll('[data-azaad-lang]').forEach(button => {
      if (button.dataset.azaadStableBound === 'true') return;
      const replacement = button.cloneNode(true);
      replacement.dataset.azaadStableBound = 'true';
      button.replaceWith(replacement);
      replacement.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const lang = replacement.dataset.azaadLang === 'en' ? 'en' : 'ar';
        persist(lang);
        const api = window.AZAAD_I18N;
        if (api?.apply) api.apply(lang, false);
        else {
          document.documentElement.lang = lang;
          document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
        }
        window.dispatchEvent(new CustomEvent('azaadLanguageChanged', { detail: { language: lang } }));
        bindLanguageButtons();
      });
    });
  }

  function stabilize() {
    tracking = false;
    trackedIntervals.forEach(nativeClearInterval);
    trackedIntervals.clear();
    window.setInterval = nativeSetInterval;
    bindLanguageButtons();
  }

  function waitForCentral(attempt = 0) {
    bindLanguageButtons();
    if (window.AZAAD_I18N || attempt >= 120) {
      stabilize();
      return;
    }
    window.setTimeout(() => waitForCentral(attempt + 1), 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForCentral(), { once: true });
  } else {
    waitForCentral();
  }
})();
