/* AZAAD authenticated UI guard.
 * Keeps the login shell from remaining visible after a valid staff session is
 * established, even if a non-critical dashboard initializer is still loading.
 * No credentials are read, stored, or logged here.
 *
 * This guard is deliberately state-based: a UI switch is allowed only when the
 * application exposes both a live Supabase access token and a validated staff
 * identity. It also watches the login shell for later code that accidentally
 * re-shows it while initialization is still running.
 */
(function installAzaadAuthUiGuard(){
  const LOGIN_ID = 'loginPage';
  const ADMIN_ID = 'adminPage';
  let observer = null;
  let pollTimer = null;

  function authenticatedStaffReady(){
    const api = window.AZAAD;
    const state = api?.state;
    return Boolean(state?.session?.access_token && state?.staff && state.staff.active !== false);
  }

  function enforceAuthenticatedShell(){
    if (!authenticatedStaffReady()) return false;
    const login = document.getElementById(LOGIN_ID);
    const admin = document.getElementById(ADMIN_ID);
    if (!login || !admin) return false;

    if (!login.classList.contains('hidden')) login.classList.add('hidden');
    if (admin.classList.contains('hidden')) admin.classList.remove('hidden');
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

  function tick(){
    installLoginObserver();
    if (enforceAuthenticatedShell()) {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      return;
    }
    if (!pollTimer) {
      pollTimer = setInterval(() => {
        installLoginObserver();
        if (enforceAuthenticatedShell()) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 250);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick, { once: true });
  } else {
    tick();
  }

  window.addEventListener('storage', tick);
  window.addEventListener('azaad-auth-ready', tick);
})();
