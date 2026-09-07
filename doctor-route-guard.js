/* AZAAD CLINIC — DOCTOR ROUTE GUARD v6 */
(() => {
  'use strict';
  if (!/\/admin\.html$/i.test(location.pathname)) return;

  let redirectInProgress = false;

  function setAdminVisibility(show) {
    const admin = document.getElementById('adminPage');
    const login = document.getElementById('loginPage');
    if (admin) admin.classList.toggle('hidden', !show);
    if (login) login.classList.toggle('hidden', !!show);
  }

  function loadOperationsCenter() {
    if (document.getElementById('azaadOperationsScript')) return;
    const script = document.createElement('script');
    script.id = 'azaadOperationsScript';
    script.src = './azaad-operations-control-center.js?v=20260905-01';
    script.defer = true;
    document.head.appendChild(script);

    const guard = document.createElement('script');
    guard.id = 'azaadOperationsRoleGuard';
    guard.src = './azaad-operations-role-guard.js?v=20260905-01';
    guard.defer = true;
    document.head.appendChild(guard);
  }

  async function currentStaff() {
    try {
      const response = await fetch(`/api/admin-auth?_=${Date.now()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) return null;
      const body = await response.json().catch(() => ({}));
      const staff = body?.staff || null;
      if (!body?.authenticated || !staff || staff.active === false) return null;
      return staff;
    } catch (_) {
      return null;
    }
  }

  async function boot() {
    try {
      const staff = await currentStaff();
      if (String(staff?.role || '').trim().toUpperCase() === 'DOCTOR') {
        if (!redirectInProgress) {
          redirectInProgress = true;
          location.replace('./doctor-dashboard.html?from=login');
        }
        return;
      }
      setAdminVisibility(true);
      loadOperationsCenter();
    } catch (error) {
      console.warn('Azaad doctor route guard v6 init:', error);
      setAdminVisibility(true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
