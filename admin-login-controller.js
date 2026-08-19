/* AZAAD Admin Login Controller
 * Production-parity readiness/diagnostic shim.
 * Authentication remains exclusively owned by admin.js.
 * No credentials, token minting, or duplicate staff-login flow lives here.
 */
(function installAzaadAdminLoginController(){
  function markReady(){
    const form = document.getElementById('loginForm');
    const client = window.AZAAD?.supabase;
    if (!form || !client?.auth?.setSession) return false;

    window.AZAAD_LOGIN_CONTROLLER_READY = true;
    return true;
  }

  function bind(){
    markReady();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  // This shim deliberately never intercepts submit/click. The canonical
  // admin.js handler must remain the single authentication authority so its
  // staff validation, state initialization, UI transition, and persistence
  // logic all execute together.
  const observer = new MutationObserver(bind);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
