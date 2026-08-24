/* AZAAD Admin Login Bootstrap
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
    if (form.dataset.azaadLoginBootstrap === '1') return true;

    form.dataset.azaadLoginBootstrap = '1';
    form.noValidate = false;
    username.disabled = false;
    username.readOnly = false;
    password.disabled = false;
    password.readOnly = false;

    const state = { queued: false };

    form.addEventListener('submit', (event) => {
      if (form.dataset.azaadBound === 'true') return;

      event.preventDefault();
      event.stopPropagation();

      state.queued = true;
      const button = event.submitter || form.querySelector('button[type="submit"]');
      if (button) {
        button.disabled = true;
        button.dataset.azaadLoginWaiting = '1';
        button.textContent = '⏳ جاري تحميل تسجيل الدخول...';
      }
    }, true);

    password.addEventListener('focus', () => {
      password.dataset.azaadLoginFocused = '1';
    }, true);

    password.addEventListener('input', (event) => {
      // Do not let unrelated document-level handlers treat password typing as
      // a UI refresh. The password value itself is never copied or persisted.
      event.stopPropagation();
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

    window.addEventListener('azaad:login-controller-bound', release);
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
