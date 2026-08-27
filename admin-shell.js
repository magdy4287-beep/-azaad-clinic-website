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

  function syncActiveState(panelId, targetButton) {
    if (!panelId) return;
    var target = String(panelId);
    var button = targetButton && document.documentElement.contains(targetButton)
      ? targetButton
      : document.querySelector('.tab[data-panel="' + CSS.escape(target) + '"]');

    document.querySelectorAll('.tab[data-panel]').forEach(function (item) {
      item.classList.toggle('active', item === button || item.getAttribute('data-panel') === target && !button);
    });
    document.querySelectorAll('.panel').forEach(function (item) {
      item.classList.toggle('active', item.id === target);
    });
  }

  function activate(panel, button) {
    if (!panel) return;

    var panelId = String(panel);
    var targetButton = button || document.querySelector('.tab[data-panel="' + CSS.escape(panelId) + '"]');

    syncActiveState(panelId, targetButton);

    try {
      window.dispatchEvent(new CustomEvent('azaad:admin-panel-activated', {
        detail: { panel: panelId }
      }));
    } catch (_) {}

    // Enterprise panels are canonical lazy mounts. A module may synchronously
    // materialize/replace its panel while handling the activation event. Reassert
    // the single requested state on the next frame; this is one bounded activation
    // transaction, not an observer or navigation loop.
    window.requestAnimationFrame(function () {
      syncActiveState(panelId, targetButton);
    });
  }

  // One delegated navigation owner handles both static and post-auth dynamically
  // mounted enterprise tabs. Capture phase guarantees the canonical owner receives
  // navigation even if a feature listener stops propagation during bubbling.
  function bindNavigation() {
    if (window.__AZAAD_ADMIN_SHELL_NAV_DELEGATED__) return;
    window.__AZAAD_ADMIN_SHELL_NAV_DELEGATED__ = true;
    document.addEventListener('click', function (event) {
      var target = event && event.target;
      var button = target && typeof target.closest === 'function'
        ? target.closest('.tab[data-panel]')
        : null;
      if (!button) return;
      if (!document.documentElement.contains(button)) return;
      activate(button.getAttribute('data-panel'), button);
    }, true);
  }

  window.addEventListener('azaad:admin-panel-requested', function (event) {
    var panel = event && event.detail ? event.detail.panel : null;
    if (!panel) return;
    var button = document.querySelector('.tab[data-panel="' + CSS.escape(String(panel)) + '"]');
    activate(String(panel), button || null);
  });

  // A lazy module can materialize or replace a panel after the activation event.
  // The registry remains the sole module-loader owner; the shell only restores
  // the already-requested visual state after that bounded transaction completes.
  window.addEventListener('azaad:admin-panel-ready', function (event) {
    var panel = event && event.detail ? event.detail.panel : null;
    if (!panel) return;
    syncActiveState(String(panel), null);
  });

  window.AZAAD_ADMIN_ACTIVATE_PANEL = activate;

  function ready() {
    bindNavigation();
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
})();