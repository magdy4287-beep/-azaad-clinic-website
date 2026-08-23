/* AZAAD Admin Shell: dependency-free UI control plane.
 * Must stay independent of Supabase, i18n, media, AI, and feature modules.
 * It owns only navigation/session escape hatches; feature controllers remain responsible for data.
 */
(function () {
  'use strict';
  if (window.__AZAAD_ADMIN_SHELL_V1__) return;
  window.__AZAAD_ADMIN_SHELL_V1__ = true;

  function byId(id) { return document.getElementById(id); }
  function showLogin() {
    var login = byId('loginPage');
    var admin = byId('adminPage');
    if (login) login.classList.remove('hidden');
    if (admin) admin.classList.add('hidden');
  }
  function clearLocalSession() {
    try { sessionStorage.removeItem('azaad_admin_token'); } catch (_) {}
    try { sessionStorage.removeItem('azaad_admin_session'); } catch (_) {}
    try { localStorage.removeItem('azaad-clinic-admin-auth'); } catch (_) {}
    try { localStorage.removeItem('sb-azaad-clinic-admin-auth-token'); } catch (_) {}
  }
  function logout() {
    clearLocalSession();
    showLogin();
    try { window.dispatchEvent(new CustomEvent('azaad:admin-shell-logout')); } catch (_) {}
    window.setTimeout(function () {
      try { window.location.replace(window.location.pathname + '?logged_out=1'); } catch (_) { window.location.reload(); }
    }, 0);
  }
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
      button.addEventListener('click', function () { activate(button.getAttribute('data-panel'), button); }, false);
    });
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    var node = target && target.closest ? target.closest('button,a,[data-panel]') : null;
    if (!node) return;
    if (node.id === 'logoutBtn') {
      event.preventDefault();
      event.stopImmediatePropagation();
      logout();
      return;
    }
    if (node.id === 'refreshBtn' || node.id === 'refreshBookings') {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.reload();
      return;
    }
    if (node.id === 'siteBtn') {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.open(node.dataset.url || window.location.origin + '/', '_blank', 'noopener,noreferrer');
      return;
    }
    var panel = node.getAttribute('data-panel');
    if (panel) activate(panel, node);
  }, true);

  function ready() {
    bindExisting();
    window.AZAAD_ADMIN_SHELL_READY = true;
    try { window.dispatchEvent(new CustomEvent('azaad:admin-shell-ready')); } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  window.setTimeout(bindExisting, 250);
  window.setTimeout(bindExisting, 1000);
})();
