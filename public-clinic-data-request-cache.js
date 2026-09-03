/* AZAAD PUBLIC CLINIC DATA REQUEST CACHE
 * One page -> one public clinic-data network request.
 * Only this exact public read endpoint is coalesced; normal fetch behavior is untouched.
 * Each consumer receives its own cloned Response so response bodies remain independently readable.
 *
 * Canonical public-data boundary: same-origin /api/public-clinic-data.
 * Legacy Supabase public-data callers are normalized before the request is made.
 */
(() => {
  'use strict';
  const TARGET = '/api/public-clinic-data';
  const LEGACY_TARGET = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-clinic-data';
  const STATE = '__AZAAD_PUBLIC_CLINIC_REQUEST_CACHE_V1__';
  if (window[STATE]) return;

  const originalFetch = window.fetch.bind(window);
  let inFlight = null;

  const isClinicDataRead = (input) => {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return false;
      const url = new URL(raw, window.location.href);
      const canonical = new URL(TARGET, window.location.href);
      const legacy = new URL(LEGACY_TARGET);
      const isEndpoint =
        (url.origin === canonical.origin && url.pathname === canonical.pathname) ||
        (url.origin === legacy.origin && url.pathname === legacy.pathname);
      return isEndpoint && url.searchParams.get('api') === 'data';
    } catch (_) {
      return false;
    }
  };

  const fetchCached = (input, init) => {
    if (!isClinicDataRead(input)) return originalFetch(input, init);
    if (!inFlight) {
      inFlight = originalFetch(`${TARGET}?api=data`, init).then(response => {
        if (!response || typeof response.clone !== 'function') throw new Error('Invalid clinic data response');
        return response;
      }).finally(() => {
        inFlight = null;
      });
    }
    return inFlight.then(response => response.clone());
  };

  window.fetch = fetchCached;
  window[STATE] = true;
})();
