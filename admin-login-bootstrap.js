/* AZAAD Admin Login Bootstrap v2
 * Dependency-free guard that runs before the module-based Admin controller.
 * It prevents a slow/failed module import from falling back to native form
 * navigation, which used to erase the password and return to the username.
 * It never stores or copies the password.
 */
(() => {
  'use strict';

  const install = () => {
    const form = document.getElementById('loginForm');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    if (!form || !username || !password) return false;
    if (form.dataset.azaadLoginBootstrap === '2') return true;

    form.dataset.azaadLoginBootstrap = '2';
    form.noValidate = false;
    username.disabled = false;
    username.readOnly = false;
    password.disabled = false;
    password.readOnly = false;
    password.removeAttribute('inert');
    password.tabIndex = 0;

    const state = { queued: false };

    form.addEventListener('submit', (event) => {
      if (form.dataset.azaadBound === 'true') return;

      event.preventDefault();
      event.stopImmediatePropagation();

      state.queued = true;
      const button = event.submitter || form.querySelector('button[type="submit"]');
      if (button) {
        button.disabled = true;
        button.dataset.azaadLoginWaiting = '1';
        button.textContent = '⏳ جاري تحميل تسجيل الدخول...';
      }
    }, true);

    // Keep the password field a normal browser input. We deliberately do not
    // stop input propagation: password managers and accessibility tooling must
    // receive the normal input/focus events.
    password.addEventListener('pointerdown', () => {
      password.disabled = false;
      password.readOnly = false;
    }, true);

    password.addEventListener('focus', () => {
      password.dataset.azaadLoginFocused = '1';
    }, true);

    const release = () => {
      if (form.dataset.azaadBound !== 'true') return;
      if (!state.queued) return;
      state.queued = false;
      const button = form.querySelector('button[data-azaad-login-waiting="1"]');
      if (button) {
        button.disabled = false;
        button.removeAttribute('data-azaad-login-waiting');
        button.textContent = 'تسجيل الدخول';
      }
      queueMicrotask(() => form.requestSubmit());
    };

    window.addEventListener('azaad:login-controller-bound', release, { once: true });
    const timer = window.setInterval(() => {
      if (form.dataset.azaadBound === 'true') {
        window.clearInterval(timer);
        release();
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
