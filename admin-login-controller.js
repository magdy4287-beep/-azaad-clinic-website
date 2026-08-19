/* AZAAD Admin Login Controller
 * Readiness-only adapter for the canonical production admin login form.
 * Authentication is owned exclusively by admin.html's canonical login flow.
 */
(function installAzaadAdminLoginController(){
  let disposed = false;
  let ready = false;

  function prepareForm(){
    if (disposed) return false;
    const form = document.getElementById('loginForm');
    if (!form) return false;

    // Keep native validation from blocking requestSubmit(); canonical login()
    // performs the username/password validation itself.
    form.noValidate = true;

    if (!ready) {
      ready = true;
      window.AZAAD_LOGIN_CONTROLLER_READY = true;
      window.dispatchEvent(new CustomEvent('azaad:login-controller-ready'));
    }
    return true;
  }

  // IMPORTANT: this module never listens for submit and never calls
  // preventDefault/stopPropagation. The form's existing canonical login()
  // handler remains the sole authentication owner and therefore the only code
  // allowed to issue the real staff-login request and set the Supabase session.
  prepareForm();

  const observer = new MutationObserver(prepareForm);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepareForm, { once: true });
  }

  window.addEventListener('pagehide', () => {
    disposed = true;
    observer.disconnect();
  }, { once: true });
})();