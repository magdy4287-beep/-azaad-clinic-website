/* ============================================================
   AZAAD CLINIC — PATIENT SESSION BRIDGE
   Keeps Patient Center synchronized with the live Supabase Auth
   session used by admin.html, including mobile Safari timing.
   No service-role credentials.
   ============================================================ */
(() => {
  'use strict';

  const KEY = 'azaad_admin_token';

  async function getAccessToken() {
    const stateToken = window.AZAAD?.state?.session?.access_token;
    if (stateToken) return stateToken;

    try {
      const supabase = window.AZAAD?.supabase;
      if (supabase?.auth) {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token || '';
        if (token) {
          try { sessionStorage.setItem(KEY, token); } catch (_) {}
          return token;
        }
      }
    } catch (error) {
      console.warn('Azaad session bridge getSession:', error);
    }

    try {
      return sessionStorage.getItem(KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function syncSession(session) {
    const token = session?.access_token || '';
    if (!token) return;
    try { sessionStorage.setItem(KEY, token); } catch (_) {}
    if (window.AZAAD?.state) window.AZAAD.state.session = session;
  }

  function clearSession() {
    try { sessionStorage.removeItem(KEY); } catch (_) {}
  }

  async function init() {
    const supabase = window.AZAAD?.supabase;
    if (!supabase?.auth) return;

    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session) syncSession(data.session);
    } catch (error) {
      console.warn('Azaad session bridge init:', error);
    }

    try {
      supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          syncSession(session);
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setTimeout(() => window.AZAAD_PATIENTS?.load?.(), 0);
          }
        } else if (event === 'SIGNED_OUT') {
          clearSession();
        }
      });
    } catch (error) {
      console.warn('Azaad session bridge listener:', error);
    }
  }

  window.AZAAD_PATIENT_SESSION = {
    getAccessToken,
    syncSession,
    clearSession
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
