/* AZAAD CLINIC — DOCTOR ROUTE GUARD v3
 *
 * IMPORTANT:
 * - Never redirect to the Doctor Dashboard merely because a doctor session
 *   already exists in storage.
 * - Redirect only immediately after an explicit SIGNED_IN event.
 * - This prevents the admin page from becoming an automatic doctor-login loop
 *   after logout or browser restore.
 */
(() => {
  'use strict';
  if (!/\/admin\.html$/i.test(location.pathname)) return;

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const STORAGE_KEY = 'azaad-clinic-admin-auth';
  let clientPromise = null;
  let redirectInProgress = false;

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

    try {
      if (!await isDoctorSession(session)) return;
      redirectInProgress = true;
      location.replace('./doctor-dashboard.html?from=login');
    } catch (error) {
      console.warn('Azaad doctor route guard v3:', error);
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
      console.warn('Azaad doctor route guard v3 init:', error);
    }
  })();
})();
