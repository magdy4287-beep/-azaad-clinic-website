/* AZAAD authenticated UI guard.
 * Presentation/readiness only. Server-side/RLS authorization remains the
 * security boundary. No credentials are logged or persisted by this guard.
 */
(function installAzaadAuthUiGuard(){
  const LOGIN_ID = 'loginPage';
  const ADMIN_ID = 'adminPage';
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const VALID_ROLES = new Set(['OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION','CASHIER','MARKETING']);
  let observer = null;
  let pollTimer = null;
  let validationInFlight = false;
  let validated = false;

  function readAccessToken(){
    try {
      const sessionToken = sessionStorage.getItem('azaad_admin_token');
      if (sessionToken) return sessionToken;
    } catch (_) {}

    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) || '';
        if (!key.includes('-auth-token')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const token = parsed?.access_token || parsed?.currentSession?.access_token;
        if (token) return token;
      }
    } catch (_) {}
    return null;
  }

  async function validateStaffSession(){
    if (validated || validationInFlight) return validated;
    const token = readAccessToken();
    if (!token) return false;

    validationInFlight = true;
    try {
      // Use the application's canonical authenticated admin endpoint rather
      // than querying clinic_staff directly, so the guard follows the same
      // server-side authorization/RLS path as the Admin controller.
      const response = await fetch(`${SUPABASE_URL}/functions/v1/azaad-admin-auth`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store'
      });
      if (!response.ok) return false;
      const body = await response.json();
      const admin = body?.admin;
      const role = String(admin?.role || '').toUpperCase();
      validated = Boolean(admin?.id && admin.active !== false && VALID_ROLES.has(role));
      return validated;
    } catch (_) {
      return false;
    } finally {
      validationInFlight = false;
    }
  }

  function enforceAuthenticatedShell(){
    if (!validated) return false;
    const login = document.getElementById(LOGIN_ID);
    const admin = document.getElementById(ADMIN_ID);
    if (!login || !admin) return false;
    login.classList.add('hidden');
    admin.classList.remove('hidden');
    return true;
  }

  function installLoginObserver(){
    const login = document.getElementById(LOGIN_ID);
    if (!login || observer) return;
    observer = new MutationObserver(enforceAuthenticatedShell);
    observer.observe(login, { attributes: true, attributeFilter: ['class', 'style'] });
    enforceAuthenticatedShell();
  }

  async function tick(){
    installLoginObserver();
    if (!validated) await validateStaffSession();
    if (enforceAuthenticatedShell()) {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      return;
    }
    if (!pollTimer) {
      pollTimer = setInterval(async () => {
        installLoginObserver();
        if (!validated) await validateStaffSession();
        if (enforceAuthenticatedShell()) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick, { once: true });
  } else {
    tick();
  }

  window.addEventListener('storage', () => { validated = false; tick(); });
  window.addEventListener('azaad-auth-ready', tick);
})();
