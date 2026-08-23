/* AZAAD Admin Shell: dependency-free navigation control plane.
 * Canonical application/auth ownership lives in admin.js.
 * This shell must never duplicate authentication, logout, refresh, or feature behavior.
 */
(function () {
  'use strict';
  if (window.__AZAAD_ADMIN_SHELL_V2__) return;
  window.__AZAAD_ADMIN_SHELL_V2__ = true;

  function activate(panel, button) {
    if (!panel) return;
    document.querySelectorAll('.tab[data-panel]').forEach(function (item) {
      item.classList.toggle('active', item === button || item.getAttribute('data-panel') === panel && !button);
    });
    document.querySelectorAll('.panel').forEach(function (item) {
      item.classList.toggle('active', item.id === panel);
    });
  }

  function bindExisting() {
    document.querySelectorAll('.tab[data-panel]').forEach(function (button) {
      if (button.dataset.adminShellBound === '1') return;
      button.dataset.adminShellBound = '1';
      button.addEventListener('click', function () {
        activate(button.getAttribute('data-panel'), button);
      }, false);
    });
  }

  function ready() {
    bindExisting();
    window.AZAAD_ADMIN_SHELL_READY = true;
    try {
      window.dispatchEvent(new CustomEvent('azaad:admin-shell-ready'));
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }

  window.setTimeout(bindExisting, 250);
  window.setTimeout(bindExisting, 1000);
})();
