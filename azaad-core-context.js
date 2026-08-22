(() => {
  'use strict';

  const TIME_ZONE = 'Africa/Cairo';
  const LOCALES = Object.freeze({ ar: 'ar-EG', en: 'en-EG' });
  const HOURS = Object.freeze({ hour: 'numeric', minute: '2-digit', hour12: true });

  function language() {
    const lang = window.AZAAD_I18N?.language?.();
    return lang === 'en' ? 'en' : 'ar';
  }

  function formatTime(value = new Date()) {
    return new Intl.DateTimeFormat(LOCALES[language()], {
      timeZone: TIME_ZONE,
      ...HOURS,
    }).format(new Date(value));
  }

  function formatDate(value, options = {}) {
    return new Intl.DateTimeFormat(LOCALES[language()], {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options,
    }).format(new Date(value));
  }

  function formatDateTime(value = new Date()) {
    return `${formatDate(value)} ${formatTime(value)}`;
  }

  function apply(root = document) {
    if (!root) return;
    root.querySelectorAll?.('[data-azaad-cairo-time]').forEach((el) => {
      const value = el.getAttribute('data-azaad-cairo-time');
      if (value) el.textContent = formatTime(value);
    });
    root.querySelectorAll?.('[data-azaad-cairo-datetime]').forEach((el) => {
      const value = el.getAttribute('data-azaad-cairo-datetime');
      if (value) el.textContent = formatDateTime(value);
    });
  }

  function releasePrepaint() {
    try {
      document.documentElement.removeAttribute('data-azaad-i18n-pending');
    } catch (_) {}
  }

  window.AZAAD_CORE_CONTEXT = Object.freeze({
    version: '1.0.0',
    timeZone: TIME_ZONE,
    language,
    formatTime,
    formatDate,
    formatDateTime,
    apply,
  });

  window.addEventListener('azaadLanguageChanged', () => {
    apply(document);
    releasePrepaint();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      apply(document);
      releasePrepaint();
    }, { once: true });
  } else {
    apply(document);
    releasePrepaint();
  }
})();
