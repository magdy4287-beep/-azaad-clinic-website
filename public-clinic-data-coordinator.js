/* AZAAD PUBLIC CLINIC DATA COORDINATOR
 * One browser request for the public clinic-data surface.
 * Coalesces app.js, public-experience-hardening.js and clinic-posts.js
 * without changing booking, scheduling, auth, or i18n behavior.
 *
 * Canonical public-data boundary: same-origin /api/public-clinic-data.
 * This module is the single browser-side owner for request coalescing.
 */
(() => {
  'use strict';
  const API = '/api/public-clinic-data';
  const originalFetch = window.fetch.bind(window);
  const state = window.__AZAAD_PUBLIC_CLINIC_DATA_COORDINATOR__ = window.__AZAAD_PUBLIC_CLINIC_DATA_COORDINATOR__ || {};
  if (state.installed) return;
  state.installed = true;

  const isClinicDataRequest = (input) => {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return false;
      const url = new URL(raw, window.location.href);
      const canonical = new URL(API, window.location.href);
      return url.origin === canonical.origin &&
        url.pathname === canonical.pathname &&
        (url.searchParams.get('api') === 'data' || url.searchParams.has('_') || url.searchParams.toString() === '');
    } catch (_) {
      return false;
    }
  };

  const makeResponse = (entry) => new Response(JSON.stringify(entry.body), {
    status: entry.status,
    statusText: entry.statusText,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });

  state.getPromise = () => {
    if (!state.promise) {
      state.promise = originalFetch(`${API}?api=data`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      }).then(async response => {
        const body = await response.json().catch(() => ({}));
        const entry = {
          body,
          status: response.status,
          statusText: response.statusText
        };
        if (!response.ok) {
          const error = new Error(body?.error || body?.message || `HTTP ${response.status}`);
          error.entry = entry;
          throw error;
        }
        return entry;
      });
      state.promise.catch(() => { state.promise = null; });
    }
    return state.promise;
  };

  window.fetch = (input, init) => {
    if (!isClinicDataRequest(input)) return originalFetch(input, init);
    return state.getPromise().then(makeResponse);
  };
})();
