/* AZAAD Admin Login Controller
 * Production-parity auth readiness bridge.
 *
 * Authentication remains exclusively owned by the canonical admin.html
 * submit handler. This file never calls staff-login, never creates tokens,
 * and never submits the form itself.
 *
 * The previous click->requestSubmit bridge could race the canonical module
 * handler and create a native-navigation lifecycle hazard after a successful
 * staff-login response. The bridge is therefore intentionally passive:
 * it only publishes readiness once the canonical form and Supabase client
 * actually exist.
 */
(function installAzaadAdminLoginController(){
  let disposed = false;

  function markReady(){
    if (disposed) return true;

    const form = document.getElementById('loginForm');
    const client = window.AZAAD?.supabase;

    if (!form || !client?.auth?.setSession) {
      return false;
    }

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

  // AZAAD is assigned by the canonical module after its own script executes;
  // that assignment does not itself mutate the DOM. Poll briefly so readiness
  // cannot remain permanently false simply because the module finished later.
  let attempts = 0;
  const readinessTimer = window.setInterval(() => {
    if (markReady() || ++attempts >= 200) {
      window.clearInterval(readinessTimer);
    }
  }, 50);

  window.addEventListener('pagehide', () => {
    disposed = true;
    observer.disconnect();
    window.clearInterval(readinessTimer);
  }, { once: true });
})();
