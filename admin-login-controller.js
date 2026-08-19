/* AZAAD Admin Login Controller
 * Passive readiness signal only.
 *
 * Authentication remains exclusively owned by the canonical admin.html
 * submit handler. This file never calls staff-login, creates tokens, or
 * submits the form. Readiness must never depend on Supabase setSession;
 * otherwise a production race can block the canonical submit path before
 * authentication even starts.
 */
(function installAzaadAdminLoginController(){
  let disposed = false;

  function markReady(){
    if (disposed) return true;
    const form = document.getElementById('loginForm');
    if (!form) return false;
    window.AZAAD_LOGIN_CONTROLLER_READY = true;
    window.dispatchEvent(new CustomEvent('azaad:login-controller-ready'));
    return true;
  }

  function bind(){ markReady(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  const observer = new MutationObserver(bind);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('pagehide', () => {
    disposed = true;
    observer.disconnect();
  }, { once: true });
})();

// Canonical admin.html owns submit/authentication; this controller is passive.
