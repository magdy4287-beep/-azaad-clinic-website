/* ============================================================
   AZAAD CLINIC — PATIENT SESSION BRIDGE
   v2.0.0

   Runs as a classic script so it is available BEFORE
   patients-center.js. It reads only the persisted Supabase
   client session / short-lived access token. No Service Role Key.
   ============================================================ */
(() => {
  'use strict';

  const SESSION_KEY = 'azaad_admin_token';
  const STORAGE_PREFIX = 'sb-derofsthjivlkcdnojww-auth-token';

  function readSession() {
    try {
      const direct = sessionStorage.getItem(SESSION_KEY);
      if (direct) return { access_token: direct };
    } catch (_) {}

    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) || '';
        if (!key.startsWith(STORAGE_PREFIX)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.access_token) return parsed;
        if (parsed?.currentSession?.access_token) return parsed.currentSession;
      }
    } catch (_) {}

    return null;
  }

  function publish(session) {
    window.AZAAD = window.AZAAD || {};
    window.AZAAD.state = window.AZAAD.state || {};
    window.AZAAD.state.session = session || null;

    if (session?.access_token) {
      try { sessionStorage.setItem(SESSION_KEY, session.access_token); } catch (_) {}
    }
  }

  publish(readSession());

  window.AZAAD_PATIENT_SESSION = {
    version: '2.0.0',
    getAccessToken: async () => {
      const session = readSession();
      publish(session);
      return session?.access_token || '';
    },
    getSession: async () => readSession()
  };

  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_KEY || (event.key || '').startsWith(STORAGE_PREFIX)) {
      publish(readSession());
    }
  });
})();
