(() => {
  'use strict';

  /*
   * AZAAD PUBLIC CENTRAL I18N BRIDGE
   *
   * The public content runtime may keep bilingual content data (ar/en),
   * but it must never own the application's language state. Central i18n
   * owns the locale; this bridge only synchronizes public-content runtimes
   * with the central locale-change event without introducing another
   * translator or another language switch.
   */

  const KEY = 'azaadClinicLanguage';
  const STATE_KEY = '__AZAAD_PUBLIC_CENTRAL_I18N_BRIDGE_V1__';

  if (window[STATE_KEY]) return;
  window[STATE_KEY] = true;

  function centralLanguage() {
    const api = window.AZAAD_I18N;
    if (api && typeof api.language === 'function') {
      const value = api.language();
      if (value === 'en' || value === 'ar') return value;
    }

    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}

    return document.documentElement.lang?.toLowerCase().startsWith('en') ? 'en' : 'ar';
  }

  function syncPublicState() {
    const language = centralLanguage();
    const state = window.__AZAAD_CLINIC_POSTS_V6__;

    if (state && typeof state === 'object') {
      // Data remains bilingual; only the active locale follows Central I18N.
      state.language = language;
    }

    document.documentElement.dataset.publicContentLanguage = language;
    window.dispatchEvent(new CustomEvent('azaadPublicContentLanguageChanged', {
      detail: { language }
    }));
  }

  window.addEventListener('azaadLanguageChanged', syncPublicState);
  window.addEventListener('storage', event => {
    if (event.key === KEY) syncPublicState();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncPublicState, { once: true });
  } else {
    syncPublicState();
  }
})();
