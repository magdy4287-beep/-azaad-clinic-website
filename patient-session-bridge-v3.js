/* AZAAD CLINIC — PATIENT SESSION BRIDGE v4.4.0 */
(() => {
  'use strict';

  const SESSION_KEY = 'azaad_admin_token';
  const ADMIN_FUNCTION = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-admin';
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

  function publish(session) {
    if (!session?.access_token) return;
    window.AZAAD = window.AZAAD || {};
    window.AZAAD.state = window.AZAAD.state || {};
    window.AZAAD.state.session = session;
    window.AZAAD.state.user = session.user || null;
    try { sessionStorage.setItem(SESSION_KEY, session.access_token); } catch (_) {}
  }

  async function syncAuth() {
    const client = window.AZAAD?.supabase;
    if (!client?.auth) return null;
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data?.session?.access_token) return null;
      publish(data.session);
      return data.session;
    } catch (_) { return null; }
  }

  async function restoreAdminInternal() {
    if (booted) return true;
    const controller = window.AZAAD;
    const client = controller?.supabase;
    const state = controller?.state;
    if (!client?.auth || !state) return false;
    const session = await syncAuth();
    if (!session?.access_token || !session?.user?.id) return false;
    try {
      const response = await fetch(`${ADMIN_FUNCTION}?api=account`, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      let body = null;
      try { body = await response.json(); } catch (_) {}
      if (!response.ok || !body?.admin) return false;
      const staff = body.admin;
      const role = String(staff.role || '').toUpperCase().trim();
      if (!staff.active || !permissionMap[role]) return false;
      state.session = session;
      state.user = session.user;
      state.staff = staff;
      state.role = role;
      state.currentRole = role;
      state.permissions = new Set(permissionMap[role]);
      document.getElementById('loginPage')?.classList.add('hidden');
      document.getElementById('adminPage')?.classList.remove('hidden');
      if (typeof controller.refresh === 'function') await controller.refresh();
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

  window.AZAAD_PATIENT_SESSION = {
    version: '4.4.0',
    getAccessToken: async () => {
      const session = await syncAuth();
      if (session?.access_token) return session.access_token;
      try { return sessionStorage.getItem(SESSION_KEY) || ''; } catch (_) { return ''; }
    },
    getSession: syncAuth,
    refresh: syncAuth,
    restoreAdmin
  };

  const loadAdminEnhancements = () => {
    if (!/admin\.html$/i.test(location.pathname)) return;
    if (window.__AZAAD_ADMIN_ENHANCEMENTS__) return;
    const script = document.createElement('script');
    script.src = './admin-enhancements-v1.js?v=2026.08.14.1';
    script.defer = true;
    document.head.appendChild(script);
  };

  const boot = () => { if (!booted) restoreAdmin(); loadAdminEnhancements(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
