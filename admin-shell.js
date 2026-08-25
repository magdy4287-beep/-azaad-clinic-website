/* AZAAD Admin Shell: canonical navigation control plane.
 * Authentication/data ownership lives in admin.js.
 * Lazy module ownership lives in lazy-admin-modules.py's generated registry.
 * This shell owns panel activation only; it never loads feature modules directly.
 */
(function () {
  'use strict';
  if (window.__AZAAD_ADMIN_SHELL_V4__) return;
  window.__AZAAD_ADMIN_SHELL_V4__ = true;

  function loadCentralSchedulingSync() {
    if (document.querySelector('script[data-azaad-central-scheduling-sync]')) return;
    var script = document.createElement('script');
    script.src = '/central-scheduling-sync.js?v=2026.08.24.1';
    script.defer = true;
    script.dataset.azaadCentralSchedulingSync = '1';
    document.head.appendChild(script);
  }

  function activate(panel, button) {
    if (!panel) return;
    document.querySelectorAll('.tab[data-panel]').forEach(function (item) {
      item.classList.toggle('active', item === button || item.getAttribute('data-panel') === panel && !button);
    });
    document.querySelectorAll('.panel').forEach(function (item) {
      item.classList.toggle('active', item.id === panel);
    });
    try {
      window.dispatchEvent(new CustomEvent('azaad:admin-panel-activated', {
        detail: { panel: panel }
      }));
    } catch (_) {}
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

  window.addEventListener('azaad:admin-panel-requested', function (event) {
    var panel = event && event.detail ? event.detail.panel : null;
    if (!panel) return;
    var button = document.querySelector('.tab[data-panel="' + CSS.escape(String(panel)) + '"]');
    activate(String(panel), button || null);
  });

  function ready() {
    bindExisting();
    loadCentralSchedulingSync();
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
