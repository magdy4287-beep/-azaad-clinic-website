(() => {
  'use strict';

  if (window.__AZAAD_LOCALE_RUNTIME_V1__) return;
  window.__AZAAD_LOCALE_RUNTIME_V1__ = true;

  const TIME_ZONE = 'Africa/Cairo';

  function language() {
    const value = window.AZAAD_I18N?.language?.();
    if (value === 'en' || value === 'ar') return value;
    return document.documentElement.lang?.toLowerCase().startsWith('en') ? 'en' : 'ar';
  }

  function formatTime12(hour24, minute) {
    const hour = Number(hour24);
    const minutes = Number(minute);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null;
    const h12 = hour % 12 || 12;
    const suffix = language() === 'ar' ? (hour >= 12 ? 'م' : 'ص') : (hour >= 12 ? 'PM' : 'AM');
    return `${h12}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  function formatDate(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(language() === 'ar' ? 'ar-EG' : 'en-EG', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(language() === 'ar' ? 'ar-EG' : 'en-EG', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  window.AZAAD_LOCALE = Object.freeze({
    version: '1.0.0',
    timeZone: TIME_ZONE,
    language,
    formatTime12,
    formatDate,
    formatDateTime
  });
})();
