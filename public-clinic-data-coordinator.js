/* AZAAD PUBLIC CLINIC DATA COORDINATOR
 * One browser request for the public clinic-data surface.
 * Coalesces app.js, public-experience-hardening.js and clinic-posts.js
 * without changing booking, scheduling, auth, or i18n behavior.
 */
(() => {
  'use strict';
  const API = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-clinic-data';
  const originalFetch = window.fetch.bind(window);
  const state = window.__AZAAD_PUBLIC_CLINIC_DATA_COORDINATOR__ = window.__AZAAD_PUBLIC_CLINIC_DATA_COORDINATOR__ || {};
  if (state.installed) return;
  state.installed = true;

  const isClinicDataRequest = (input) => {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return false;
      const url = new URL(raw, window.location.href);
      return url.origin === new URL(API).origin && url.pathname === new URL(API).pathname && (url.searchParams.get('api') === 'data' || url.searchParams.has('_'));
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
