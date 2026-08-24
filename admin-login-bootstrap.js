/* AZAAD Admin Login Bootstrap v3
 * Single pre-controller guard for the Admin login surface.
 * Authentication ownership remains exclusively in admin.js.
 * This guard prevents native form navigation while admin.js is loading,
 * without disabling or mutating the username/password fields.
 */
(() => {
  'use strict';

  const install = () => {
    const form = document.getElementById('loginForm');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    if (!form || !username || !password) return false;
    if (form.dataset.azaadLoginBootstrap === '3') return true;

    form.dataset.azaadLoginBootstrap = '3';

    // Keep both credential fields as ordinary browser controls.
    username.disabled = false;
    username.readOnly = false;
    password.disabled = false;
    password.readOnly = false;
    password.removeAttribute('inert');
    password.tabIndex = 0;

    let controllerReady = form.dataset.azaadBound === 'true';
    let queuedSubmit = false;

    const markReady = () => {
      controllerReady = form.dataset.azaadBound === 'true';
      if (!controllerReady || !queuedSubmit) return;
      queuedSubmit = false;
      // The canonical controller owns the second submit event.
      queueMicrotask(() => form.requestSubmit());
    };

    // Capture only submit events. Never intercept focus, pointer, key, or input.
    form.addEventListener('submit', (event) => {
      controllerReady = form.dataset.azaadBound === 'true';
      if (controllerReady) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      queuedSubmit = true;

      const errorBox = document.getElementById('loginError');
      if (errorBox) {
        errorBox.textContent = 'جاري تحميل نظام تسجيل الدخول، يرجى المحاولة مرة أخرى بعد لحظات.';
        errorBox.classList.remove('hidden');
      }
    }, true);

    window.addEventListener('azaad:login-controller-bound', markReady, { once: true });

    const timer = window.setInterval(() => {
      if (form.dataset.azaadBound === 'true') {
        window.clearInterval(timer);
        markReady();
      }
    }, 50);

    window.setTimeout(() => window.clearInterval(timer), 30000);
    return true;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
