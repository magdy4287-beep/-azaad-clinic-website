/* AZAAD PUBLIC CLINIC DATA REQUEST CACHE
 * One page -> one public clinic-data network request.
 * Only this exact public read endpoint is coalesced; normal fetch behavior is untouched.
 * Each consumer receives its own cloned Response so response bodies remain independently readable.
 */
(() => {
  'use strict';
  const TARGET = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-clinic-data';
  const STATE = '__AZAAD_PUBLIC_CLINIC_REQUEST_CACHE_V1__';
  if (window[STATE]) return;

  const originalFetch = window.fetch.bind(window);
  let inFlight = null;

  const isClinicDataRead = (input) => {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return false;
      const url = new URL(raw, window.location.href);
      return url.origin + url.pathname === TARGET && url.searchParams.get('api') === 'data';
    } catch (_) {
      return false;
    }
  };

  const fetchCached = (input, init) => {
    if (!isClinicDataRead(input)) return originalFetch(input, init);
    if (!inFlight) {
      inFlight = originalFetch(input, init).then(response => {
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
