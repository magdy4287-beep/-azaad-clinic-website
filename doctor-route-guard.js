/* AZAAD CLINIC — DOCTOR ROUTE GUARD v2 */
(() => {
  'use strict';
  if (!/\/admin\.html$/i.test(location.pathname)) return;

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const STORAGE_KEY = 'azaad-clinic-admin-auth';
  let redirected = false;
  let clientPromise = null;

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

  async function routeDoctor() {
    if (redirected) return;
    try {
      const supabase = await getClient();
      const { data, error } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (error || !token) return;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/azaad-admin-auth?_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_KEY
        }
      });

      const body = await response.json().catch(() => ({}));
      const admin = body?.admin || body?.staff || {};
      const role = String(admin.role || '').trim().toUpperCase();
      const active = admin.active !== false;

      if (response.ok && active && role === 'DOCTOR') {
        redirected = true;
        location.replace('./doctor-dashboard.html?from=admin');
      }
    } catch (error) {
      console.warn('Azaad doctor route guard v2:', error);
    }
  }

  routeDoctor();
  setTimeout(routeDoctor, 250);
  setTimeout(routeDoctor, 750);
  setTimeout(routeDoctor, 1500);
  setTimeout(routeDoctor, 3000);
})();
