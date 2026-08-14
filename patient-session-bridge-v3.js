/* AZAAD CLINIC — PATIENT SESSION BRIDGE v3.0.0 */
(() => {
  'use strict';
  const SESSION_KEY = 'azaad_admin_token';
  const AUTH_SUFFIX = '-auth-token';

  function normalize(value) {
    if (!value) return null;
    if (typeof value === 'string') {
      try { return normalize(JSON.parse(value)); } catch (_) {
        return value.length > 20 ? { access_token: value } : null;
      }
    }
    if (value?.access_token) return value;
    if (value?.currentSession?.access_token) return value.currentSession;
    if (value?.session?.access_token) return value.session;
    if (value?.data?.session?.access_token) return value.data.session;
    return null;
  }

  function scan(storage) {
    try {
      const direct = normalize(storage.getItem(SESSION_KEY));
      if (direct?.access_token) return direct;
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i) || '';
        const raw = storage.getItem(key);
        if (!raw) continue;
        if (key.endsWith(AUTH_SUFFIX) || /token|session|supabase|auth/i.test(key)) {
          const session = normalize(raw);
          if (session?.access_token) return session;
        }
      }
    } catch (_) {}
    return null;
  }

  function read() { return scan(sessionStorage) || scan(localStorage); }
  function publish(session) {
    window.AZAAD = window.AZAAD || {};
    window.AZAAD.state = window.AZAAD.state || {};
    window.AZAAD.state.session = session || null;
    if (session?.access_token) {
      try { sessionStorage.setItem(SESSION_KEY, session.access_token); } catch (_) {}
    }
  }
  function refresh() { const s = read(); publish(s); return s; }

  refresh();
  window.AZAAD_PATIENT_SESSION = {
    version: '3.0.0',
    getAccessToken: async () => refresh()?.access_token || '',
    getSession: async () => refresh(),
    refresh
  };
  window.addEventListener('storage', refresh);
  [0, 50, 150, 300, 600, 1000].forEach(ms => setTimeout(refresh, ms));
})();
