/* AZAAD CLINIC — DOCTOR ROUTE GUARD v4
 *
 * Doctor login must transition directly to the Doctor Dashboard.
 * A Doctor session must never expose the Admin Dashboard, even briefly.
 * A stored session alone must never trigger an automatic redirect.
 */
(() => {
  'use strict';
  if (!/\/admin\.html$/i.test(location.pathname)) return;

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const STORAGE_KEY = 'azaad-clinic-admin-auth';
  let clientPromise = null;
  let redirectInProgress = false;

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
    // INITIAL_SESSION is intentionally ignored. A stored session must NOT
    // cause an automatic redirect when the browser/page is opened.
    if (event !== 'SIGNED_IN' || redirectInProgress) return;

    // Hide the Admin Dashboard immediately while the role is verified.
    // This prevents a Doctor login from briefly rendering Admin data.
    setAdminVisibility(false);

    try {
      if (await isDoctorSession(session)) {
        redirectInProgress = true;
        location.replace('./doctor-dashboard.html?from=login');
        return;
      }

      // Non-doctor staff remain in the Admin Panel.
      setAdminVisibility(true);
    } catch (error) {
      // If role verification fails, do not expose Admin data from this event.
      // The normal login flow can remain responsible for its own error state.
      console.warn('Azaad doctor route guard v4:', error);
    }
  }

  (async () => {
    try {
      const supabase = await getClient();
      supabase.auth.onAuthStateChange((event, session) => {
        // Avoid awaiting Supabase calls directly inside the auth callback.
        setTimeout(() => handleAuthEvent(event, session), 0);
      });
    } catch (error) {
      console.warn('Azaad doctor route guard v4 init:', error);
    }
  })();
})();
