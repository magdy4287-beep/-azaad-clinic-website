/* AZAAD Admin Login Controller
 * Production-parity login bridge.
 * Authentication remains exclusively owned by the canonical admin.html/admin.js
 * submit handler. This file never calls staff-login and never creates tokens.
 *
 * The bridge only normalizes the browser click -> form-submit path. This is
 * needed because another UI handler can cancel the native button default action
 * before the canonical submit listener receives it.
 */
(function installAzaadAdminLoginController(){
  let ready = false;
  let forwardingSubmit = false;

  function markReady(){
    const form = document.getElementById('loginForm');
    const client = window.AZAAD?.supabase;
    if (!form || !client?.auth?.setSession) return false;

    window.AZAAD_LOGIN_CONTROLLER_READY = true;
    ready = true;
    return true;
  }

  function bind(){
    const form = document.getElementById('loginForm');
    if (!form) return;

    markReady();

    if (form.dataset.azaadLoginClickBridgeBound === 'true') return;
    form.dataset.azaadLoginClickBridgeBound = 'true';

    const button = form.querySelector('button[type="submit"]');
    if (!button) return;

    button.addEventListener('click', event => {
      if (!ready || forwardingSubmit) return;

      // Preserve the canonical submit handler while preventing any competing
      // click/default-navigation handler from swallowing the form submission.
      event.preventDefault();
      forwardingSubmit = true;
      try {
        form.requestSubmit(button);
      } finally {
        forwardingSubmit = false;
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  const observer = new MutationObserver(bind);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
