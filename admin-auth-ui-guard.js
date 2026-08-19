/* AZAAD authenticated UI guard.
 * Keeps the login shell from remaining visible after a valid staff session is
 * established, even if a non-critical dashboard initializer is still loading.
 * No credentials are read, stored, or logged here.
 *
 * The admin controller keeps its auth state inside an ES module closure, so a
 * DOM-only guard cannot safely depend on window.AZAAD.state. Instead this guard
 * validates the persisted Supabase session and the active clinic_staff mapping
 * directly. This is a presentation/readiness guard only; RLS/server-side
 * authorization remains the security boundary.
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

  function readPersistedAccessToken(){
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) || '';
        if (!key.includes('-auth-token')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.access_token) return parsed.access_token;
        if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
      }
    } catch (_) {}
    return null;
  }

  async function validateStaffSession(){
    if (validated || validationInFlight) return validated;
    const token = readPersistedAccessToken();
    if (!token) return false;

    validationInFlight = true;
    try {
      const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store'
      });
      if (!userResponse.ok) return false;
      const user = await userResponse.json();
      const userId = user?.id;
      if (!userId) return false;

      const query = `${SUPABASE_URL}/rest/v1/clinic_staff?select=id,active,role&auth_user_id=eq.${encodeURIComponent(userId)}&active=eq.true&limit=1`;
      const staffResponse = await fetch(query, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        },
        cache: 'no-store'
      });
      if (!staffResponse.ok) return false;
      const rows = await staffResponse.json();
      const staff = Array.isArray(rows) ? rows[0] : null;
      validated = Boolean(staff?.id && staff.active !== false && VALID_ROLES.has(String(staff.role || '').toUpperCase()));
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
    observer = new MutationObserver(() => {
      enforceAuthenticatedShell();
    });
    observer.observe(login, { attributes: true, attributeFilter: ['class'] });
    enforceAuthenticatedShell();
  }

  async function tick(){
    installLoginObserver();
    if (!validated) await validateStaffSession();
    if (enforceAuthenticatedShell()) {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
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

  window.addEventListener('storage', () => {
    validated = false;
    tick();
  });
  window.addEventListener('azaad-auth-ready', tick);
})();
