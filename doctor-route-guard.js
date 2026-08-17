/* AZAAD CLINIC — DOCTOR ROUTE GUARD v4
 *
 * Doctor login must transition directly to the Doctor Dashboard.
 * A Doctor session must never expose the Admin Dashboard, even briefly.
 * A stored session alone must never trigger an automatic redirect.
 *
 * Admin responsive bootstrap is included here because this file is loaded
 * on admin.html before the dashboard becomes interactive.
 */
(() => {
  'use strict';
  if (!/\/admin\.html$/i.test(location.pathname)) return;

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const STORAGE_KEY = 'azaad-clinic-admin-auth';
  let clientPromise = null;
  let redirectInProgress = false;

  function installAdminResponsiveStyles() {
    if (document.getElementById('azaad-admin-responsive-v1')) return;
    const style = document.createElement('style');
    style.id = 'azaad-admin-responsive-v1';
    style.textContent = `
      html, body { max-width: 100%; overflow-x: hidden; }
      .admin { width: 100%; }
      .topbar, .card, .stat, .modal-box { min-width: 0; }
      .top-actions, .item-actions, .modal-actions { align-items: stretch; }
      .top-actions .btn, .item-actions .btn, .modal-actions .btn { min-height: 44px; }
      .tabs { scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
      .tab { min-height: 44px; }
      .table-wrap { max-width: 100%; -webkit-overflow-scrolling: touch; }
      input, select, textarea { min-height: 46px; font-size: 16px; }
      .modal-box { -webkit-overflow-scrolling: touch; }

      @media (max-width: 800px) {
        .admin { padding: 10px; }
        .topbar { padding: 14px; border-radius: 14px; }
        .topbar > div:first-child { width: 100%; }
        .top-actions { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .top-actions .btn { width: 100%; padding-inline: 8px; }
        .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .stat { padding: 14px; }
        .stat-number { font-size: 26px; }
        .tabs { margin-inline: -2px; padding: 2px 2px 8px; }
        .panel-head { align-items: stretch; }
        .panel-head > * { min-width: 0; }
        .panel-head .btn, .panel-head select { width: 100%; max-width: none !important; }
        .card { padding: 14px; border-radius: 14px; }
        .item { align-items: stretch; }
        .item > * { min-width: 0; }
        .item-actions { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .item-actions .btn { width: 100%; }
        .modal { padding: 0; align-items: flex-end; }
        .modal-box { width: 100%; max-width: none; max-height: 94vh; border-radius: 18px 18px 0 0; padding: 16px; }
        .modal-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .modal-actions .btn { width: 100%; }
        .schedule-head { align-items: stretch; }
        .schedule-head > * { width: 100%; max-width: none !important; }
        .time-row { grid-template-columns: 1fr; }
      }

      @media (max-width: 560px) {
        .top-actions { grid-template-columns: 1fr 1fr; }
        .top-actions #logoutBtn { grid-column: 1 / -1; }
        .stats { grid-template-columns: 1fr 1fr; gap: 8px; }
        .stat { padding: 12px; }
        .stat-number { font-size: 23px; }
        .tabs { gap: 6px; }
        .tab { padding: 9px 13px; font-size: 13px; flex: 0 0 auto; }
        h2 { font-size: 22px; }
        .filters, .grid { grid-template-columns: 1fr !important; }
        .table-wrap { border: 0; overflow: visible; }
        .table-wrap table { min-width: 0; width: 100%; display: block; }
        .table-wrap thead { display: none; }
        .table-wrap tbody, .table-wrap tr { display: block; width: 100%; }
        .table-wrap tr { background: #fff; border: 1px solid #e3e6ed; border-radius: 12px; margin-bottom: 10px; padding: 8px; }
        .table-wrap td { display: grid; grid-template-columns: minmax(90px, 38%) 1fr; gap: 8px; width: 100%; min-height: 42px; padding: 9px 4px; border-bottom: 1px solid #f0f1f4; text-align: start; overflow-wrap: anywhere; }
        .table-wrap td:last-child { border-bottom: 0; }
        .table-wrap td::before { content: attr(data-label); font-weight: 800; color: #17214f; }
        .table-wrap td[colspan] { display: block; }
        .item-actions, .modal-actions { grid-template-columns: 1fr; }
        .login-page { padding: 12px; }
        .login-card { padding: 20px; }
        .logo { font-size: 21px; }
        .toast { left: 10px; right: 10px; bottom: 10px; }
      }

      @media (max-width: 380px) {
        .admin { padding: 7px; }
        .topbar, .card { padding: 11px; }
        .stats { grid-template-columns: 1fr 1fr; }
        .stat-number { font-size: 21px; }
        .tab { font-size: 12px; padding-inline: 11px; }
        .table-wrap td { grid-template-columns: minmax(76px, 42%) 1fr; font-size: 12px; }
      }
    `;
    document.head.appendChild(style);

    const labelTables = () => {
      document.querySelectorAll('.table-wrap table').forEach(table => {
        const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
        table.querySelectorAll('tbody tr').forEach(row => {
          [...row.children].forEach((cell, index) => {
            if (cell.tagName === 'TD' && headers[index] && !cell.hasAttribute('data-label')) {
              cell.setAttribute('data-label', headers[index]);
            }
          });
        });
      });
    };

    labelTables();
    new MutationObserver(labelTables).observe(document.body, { childList: true, subtree: true });
  }

  function setAdminVisibility(show) {
    const adminPage = document.getElementById('adminPage');
    const loginPage = document.getElementById('loginPage');
    if (adminPage) adminPage.classList.toggle('hidden', !show);
    if (loginPage) loginPage.classList.toggle('hidden', !!show);
  }

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            storageKey: STORAGE_KEY,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          }
        })
      );
    }
    return clientPromise;
  }

  async function isDoctorSession(session) {
    const token = session?.access_token;
    if (!token) return false;

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/azaad-admin-auth?_=${Date.now()}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_KEY
        }
      }
    );

    const body = await response.json().catch(() => ({}));
    const admin = body?.admin || body?.staff || {};
    const role = String(admin.role || '').trim().toUpperCase();
    const active = admin.active !== false;
    return response.ok && active && role === 'DOCTOR';
  }

  async function handleAuthEvent(event, session) {
    if (event !== 'SIGNED_IN' || redirectInProgress) return;
    setAdminVisibility(false);

    try {
      if (await isDoctorSession(session)) {
        redirectInProgress = true;
        location.replace('./doctor-dashboard.html?from=login');
        return;
      }
      setAdminVisibility(true);
    } catch (error) {
      console.warn('Azaad doctor route guard v4:', error);
    }
  }

  installAdminResponsiveStyles();

  (async () => {
    try {
      const supabase = await getClient();
      supabase.auth.onAuthStateChange((event, session) => {
        setTimeout(() => handleAuthEvent(event, session), 0);
      });
    } catch (error) {
      console.warn('Azaad doctor route guard v4 init:', error);
    }
  })();
})();
