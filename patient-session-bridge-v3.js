/* AZAAD CLINIC — PATIENT SESSION BRIDGE v4.0.0 */
(() => {
  'use strict';

  const SESSION_KEY = 'azaad_admin_token';
  let bootstrapped = false;

  function publish(session) {
    if (!session?.access_token) return;

    window.AZAAD = window.AZAAD || {};
    window.AZAAD.state = window.AZAAD.state || {};
    window.AZAAD.state.session = session;

    try {
      sessionStorage.setItem(SESSION_KEY, session.access_token);
    } catch (_) {}
  }

  async function syncAuth() {
    const controller = window.AZAAD;
    const client = controller?.supabase;
    if (!client?.auth) return null;

    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data?.session?.access_token) return null;
      publish(data.session);
      return data.session;
    } catch (_) {
      return null;
    }
  }

  async function restoreAdmin() {
    if (bootstrapped) return;

    const controller = window.AZAAD;
    const client = controller?.supabase;
    const state = controller?.state;
    if (!client?.auth || !state) return;

    const session = await syncAuth();
    if (!session?.user?.id) return;

    try {
      const { data: staff, error } = await client
        .from('clinic_staff')
        .select('id,auth_user_id,full_name,username,email,phone,role,active')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (error || !staff || staff.active === false) return;

      const role = String(staff.role || '').toUpperCase().trim();
      const permissionMap = {
        OWNER: ['dashboard.view','bookings.view','patients.view','followups.view','marketing.view','finance.view','staff.view'],
        ADMIN: ['dashboard.view','bookings.view','patients.view','followups.view','marketing.view','finance.view','staff.view'],
        MANAGER: ['dashboard.view','bookings.view','patients.view','followups.view','marketing.view','finance.view','staff.view'],
        SECRETARY: ['dashboard.view','bookings.view','patients.view','followups.view'],
        CASHIER: ['dashboard.view','finance.view'],
        RECEPTION: ['dashboard.view','bookings.view','patients.view','followups.view'],
        DOCTOR: ['dashboard.view','bookings.view','patients.view','followups.view'],
        MARKETING: ['dashboard.view','marketing.view']
      };

      if (!permissionMap[role]) return;

      state.session = session;
      state.user = session.user;
      state.staff = staff;
      state.role = role;
      state.permissions = new Set(permissionMap[role]);
      state.initialized = true;

      const loginPage = document.getElementById('loginPage');
      const adminPage = document.getElementById('adminPage');
      if (loginPage) loginPage.classList.add('hidden');
      if (adminPage) adminPage.classList.remove('hidden');

      if (typeof controller.refresh === 'function') {
        await controller.refresh();
      }

      bootstrapped = true;
    } catch (_) {}
  }

  window.AZAAD_PATIENT_SESSION = {
    version: '4.0.0',
    getAccessToken: async () => {
      const session = await syncAuth();
      if (session?.access_token) return session.access_token;
      try { return sessionStorage.getItem(SESSION_KEY) || ''; } catch (_) { return ''; }
    },
    getSession: async () => syncAuth(),
    refresh: syncAuth
  };

  const boot = () => {
    syncAuth();
    restoreAdmin();
  };

  [0, 50, 150, 300, 600, 1000, 2000].forEach(ms => setTimeout(boot, ms));

  window.addEventListener('storage', () => {
    syncAuth();
  });
})();
