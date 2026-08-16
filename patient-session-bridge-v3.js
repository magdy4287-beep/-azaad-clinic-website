/* AZAAD CLINIC — PATIENT SESSION BRIDGE v5.2.0 */
(() => {
  'use strict';

  const SESSION_KEY = 'azaad_admin_token';
  const ADMIN_FUNCTION = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-admin';
  const I18N_STABILITY_SCRIPT = './central-i18n-stability.js?v=2026.08.16.1';
  const I18N_SCRIPT = './central-i18n.js?v=2026.08.14.2';
  const ENHANCEMENTS_SCRIPT = './admin-enhancements-v1.js?v=2026.08.14.2';
  let restorePromise = null;
  let booted = false;

  const permissionMap = {
    OWNER: ['dashboard.view','bookings.view','patients.view','followups.view','marketing.view','finance.view','staff.view'],
    ADMIN: ['dashboard.view','bookings.view','patients.view','followups.view','marketing.view','finance.view','staff.view'],
    MANAGER: ['dashboard.view','bookings.view','patients.view','followups.view','marketing.view','finance.view','staff.view'],
    SECRETARY: ['dashboard.view','bookings.view','followups.view','patients.view'],
    CASHIER: ['dashboard.view','finance.view'],
    RECEPTION: ['dashboard.view','bookings.view','followups.view','patients.view'],
    DOCTOR: ['dashboard.view','bookings.view','patients.view','followups.view'],
    MARKETING: ['dashboard.view','marketing.view']
  };

  const waitForAzaad = async (attempt = 0) => {
    if (window.AZAAD?.supabase?.auth) return true;
    if (attempt >= 100) return false;
    await new Promise(resolve => setTimeout(resolve, 50));
    return waitForAzaad(attempt + 1);
  };

  function publish(session) {
    if (!session?.access_token) return;
    window.AZAAD = window.AZAAD || {};
    window.AZAAD.state = window.AZAAD.state || {};
    window.AZAAD.state.session = session;
    window.AZAAD.state.user = session.user || null;
    try { sessionStorage.setItem(SESSION_KEY, session.access_token); } catch (_) {}
  }

  async function syncAuth() {
    const ready = await waitForAzaad();
    if (!ready) return null;
    const client = window.AZAAD?.supabase;
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data?.session?.access_token) return null;
      publish(data.session);
      return data.session;
    } catch (error) {
      console.warn('Azaad session sync:', error);
      return null;
    }
  }

  function routeDoctor(staff) {
    const role = String(staff?.role || '').toUpperCase().trim();
    if (role !== 'DOCTOR') return false;
    if (/\/doctor-dashboard\.html$/i.test(location.pathname)) return false;
    location.replace('./doctor-dashboard.html');
    return true;
  }

  async function restoreAdminInternal() {
    if (booted) return true;
    const ready = await waitForAzaad();
    if (!ready) return false;
    const controller = window.AZAAD;
    const client = controller?.supabase;
    const state = controller?.state;
    if (!client?.auth || !state) return false;

    const session = await syncAuth();
    if (!session?.access_token || !session?.user?.id) return false;

    try {
      const response = await fetch(`${ADMIN_FUNCTION}?api=account&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa'
        },
        cache: 'no-store'
      });
      let body = null;
      try { body = await response.json(); } catch (_) {}
      if (!response.ok || !body?.admin) {
        console.warn('Admin session validation failed:', response.status, body?.error || 'unknown');
        return false;
      }

      const staff = body.admin;
      const role = String(staff.role || '').toUpperCase().trim();
      if (!staff.active || !permissionMap[role]) return false;

      state.session = session;
      state.user = session.user;
      state.staff = staff;
      state.role = role;
      state.currentRole = role;
      state.permissions = new Set(permissionMap[role]);

      if (routeDoctor(staff)) {
        booted = true;
        return true;
      }

      document.getElementById('loginPage')?.classList.add('hidden');
      document.getElementById('adminPage')?.classList.remove('hidden');

      if (typeof controller.refresh === 'function') {
        try { await controller.refresh(); }
        catch (error) { console.warn('Admin refresh after restore:', error); }
      }

      state.initialized = true;
      booted = true;
      return true;
    } catch (error) {
      console.error('Admin restore error:', error);
      return false;
    }
  }

  function restoreAdmin() {
    if (booted) return Promise.resolve(true);
    if (!restorePromise) restorePromise = restoreAdminInternal().finally(() => { restorePromise = null; });
    return restorePromise;
  }

  async function protectStartupSignOut() {
    const ready = await waitForAzaad();
    if (!ready) return;
    const auth = window.AZAAD?.supabase?.auth;
    if (!auth || auth.__azaadOriginalSignOut) return;
    const original = auth.signOut.bind(auth);
    auth.__azaadOriginalSignOut = original;
    auth.__azaadStartupGuard = true;
    auth.signOut = async (...args) => {
      if (auth.__azaadStartupGuard) {
        console.warn('Azaad startup auth guard prevented an early sign-out.');
        return { data: {}, error: null };
      }
      return original(...args);
    };
    window.setTimeout(() => {
      if (!booted && auth.__azaadStartupGuard) {
        auth.__azaadStartupGuard = false;
        auth.signOut = auth.__azaadOriginalSignOut;
      }
    }, 15000);
  }

  window.AZAAD_AUTH_READY = restoreAdmin();

  window.AZAAD_PATIENT_SESSION = {
    version: '5.2.0',
    getAccessToken: async () => {
      const session = await syncAuth();
      if (session?.access_token) return session.access_token;
      try { return sessionStorage.getItem(SESSION_KEY) || ''; } catch (_) { return ''; }
    },
    getSession: syncAuth,
    refresh: syncAuth,
    restoreAdmin
  };

  function loadScriptOnce(src, key) {
    if (document.querySelector(`script[data-azaad-script="${key}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.azaadScript = key;
    document.head.appendChild(script);
  }

  const loadAdminEnhancements = () => {
    if (!/admin\.html$/i.test(location.pathname)) return;
    if (window.__AZAAD_ADMIN_ENHANCEMENTS__) return;
    loadScriptOnce(ENHANCEMENTS_SCRIPT, '__AZAAD_ADMIN_ENHANCEMENTS__');
  };

  const loadI18nStability = () => loadScriptOnce(I18N_STABILITY_SCRIPT, '__AZAAD_CENTRAL_I18N_STABILITY__');
  const loadCentralI18n = () => loadScriptOnce(I18N_SCRIPT, '__AZAAD_CENTRAL_I18N__');

  const boot = async () => {
    loadI18nStability();
    loadCentralI18n();
    loadAdminEnhancements();
    protectStartupSignOut();
    const ready = await waitForAzaad();
    if (!ready) return;
    await restoreAdmin();
    try { await window.AZAAD_AUTH_READY; } catch (_) {}
  };

  window.addEventListener('pageshow', () => { if (!booted) restoreAdmin(); });
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !booted) restoreAdmin(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
