/* AZAAD authenticated UI guard.
 * Keeps the login shell from remaining visible after a valid staff session is
 * established, even if a non-critical dashboard initializer is still loading.
 * No credentials are read, stored, or logged here.
 */
(function installAzaadAuthUiGuard(){
  const LOGIN_ID = 'loginPage';
  const ADMIN_ID = 'adminPage';
  const started = Date.now();
  const MAX_WAIT_MS = 20000;

  function showAdminWhenAuthenticated(){
    const api = window.AZAAD;
    const state = api?.state;
    if (!state?.session?.access_token || !state?.staff) return false;
    const login = document.getElementById(LOGIN_ID);
    const admin = document.getElementById(ADMIN_ID);
    if (!login || !admin) return false;
    login.classList.add('hidden');
    admin.classList.remove('hidden');
    return true;
  }

  function tick(){
    if (showAdminWhenAuthenticated()) return;
    if (Date.now() - started < MAX_WAIT_MS) setTimeout(tick, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick, { once: true });
  } else {
    tick();
  }

  window.addEventListener('storage', tick);
})();
