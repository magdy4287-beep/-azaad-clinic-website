/* AZAAD CLINIC — DOCTOR ROUTE GUARD */
(() => {
  'use strict';
  if (!/admin\.html$/i.test(location.pathname)) return;
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  let redirected = false;
  const route = async () => {
    if (redirected) return;
    const client = window.AZAAD?.supabase;
    if (!client?.auth) return;
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data?.session?.access_token) return;
      const token = data.session.access_token;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/azaad-admin-auth?_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, apikey: KEY }
      });
      const body = await response.json().catch(() => ({}));
      const role = String(body?.admin?.role || '').toUpperCase().trim();
      if (response.ok && body?.admin?.active !== false && role === 'DOCTOR') {
        redirected = true;
        location.replace('./doctor-dashboard.html');
      }
    } catch (e) {
      console.warn('Azaad doctor route guard:', e);
    }
  };
  const boot = () => {
    route();
    const auth = window.AZAAD?.supabase?.auth;
    if (auth && !auth.__azaadDoctorGuardBound) {
      auth.__azaadDoctorGuardBound = true;
      auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') setTimeout(route, 0);
      });
    }
    let attempts = 0;
    const timer = setInterval(() => {
      route();
      if (++attempts >= 30 || redirected) clearInterval(timer);
    }, 500);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
