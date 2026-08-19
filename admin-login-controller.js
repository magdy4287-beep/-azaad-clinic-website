/* AZAAD Admin Login Controller
 * Production-parity readiness signal only.
 * Authentication remains exclusively owned by the canonical admin.html/admin.js
 * submit handler. This file never calls staff-login, never calls requestSubmit,
 * never prevents the submit event, and never creates or seeds tokens.
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

  const observer = new MutationObserver(bind);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
