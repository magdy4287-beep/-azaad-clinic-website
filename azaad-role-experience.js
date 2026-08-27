/* AZAAD Role Experience + responsive administration navigation.
   UI visibility is convenience only; protected operations remain server-authorized. */
(() => {
  'use strict';
  const ENTERPRISE_ADMIN_PANELS = [
    'patient360EnterprisePanel','rcmEnterprisePanel','analyticsEnterprisePanel',
    'financeEnterprisePanel','purchasingEnterprisePanel','marketingEnterprisePanel',
    'insightsEnterprisePanel','securityEnterprisePanel'
  ];
  const ROLE_PANELS = {
    OWNER:['bookings','doctors','services','schedules','posts','holidays','hours','staff','settings','account', ...ENTERPRISE_ADMIN_PANELS],
    ADMIN:['bookings','doctors','services','schedules','posts','holidays','hours','staff','settings','account', ...ENTERPRISE_ADMIN_PANELS],
    MANAGER:['bookings','doctors','services','schedules','posts','holidays','hours','staff','settings','account', ...ENTERPRISE_ADMIN_PANELS],
    SECRETARY:['bookings'], RECEPTION:['bookings'], CASHIER:['bookings'], MARKETING:['posts','marketingEnterprisePanel']
  };
  const getAuthenticatedRole = () => {
    // Keep the authenticated-role provenance explicit: this is session state, not
    // a client-supplied role or a hard-coded UI role.
    const authenticatedState = window.AZAAD && window.AZAAD.state;
    const authenticatedRole = authenticatedState && authenticatedState.role;
    return authenticatedRole ? String(authenticatedRole).toUpperCase().trim() : '';
  };
  const role = () => {
    const shellRole = getAuthenticatedRole();
    if (shellRole) return shellRole;
    return String(document.body.dataset.role || '').toUpperCase().trim();
  };
  function exposeAuthenticatedRole() {
    const current = role();
    if (!current) return false;
    document.body.dataset.role = current;
    document.documentElement.dataset.role = current;
    return true;
  }
  function addLanguageSwitcher() {
    if (document.getElementById('azaadLanguageSwitcher')) return;
    const host = document.querySelector('.top-actions') || document.querySelector('.topbar');
    if (!host) return;
    const wrap = document.createElement('div');
    wrap.id = 'azaadLanguageSwitcher';
    wrap.className = 'azaad-language-switcher';
    wrap.innerHTML = '<button type="button" class="btn btn-secondary" data-lang="ar" aria-label="العربية">عربي</button><button type="button" class="btn btn-secondary" data-lang="en" aria-label="English">English</button>';
    host.prepend(wrap);
    wrap.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => window.AZAAD_I18N?.setLanguage?.(btn.dataset.lang)));
  }
  function applyRoleNavigation() {
    exposeAuthenticatedRole();
    const current = role();
    if (!current || current === 'DOCTOR') return;
    const allowed = new Set(ROLE_PANELS[current] || []);
    document.querySelectorAll('.tabs .tab[data-panel]').forEach(tab => {
      const visible = allowed.has(tab.dataset.panel);
      tab.hidden = !visible;
      tab.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });

    // Role navigation owns tab visibility only. Panel activation/display belongs
    // exclusively to the canonical admin shell; changing inline panel styles here
    // created a second visibility owner and could leave enterprise panels hidden
    // after a legitimate activation click.
    const active = document.querySelector('.tabs .tab.active:not([hidden])');
    if (!active) {
      const firstAllowed = document.querySelector('.tabs .tab[data-panel]:not([hidden])');
      if (firstAllowed) {
        if (typeof window.AZAAD_ADMIN_ACTIVATE_PANEL === 'function') {
          window.AZAAD_ADMIN_ACTIVATE_PANEL(firstAllowed.dataset.panel, firstAllowed);
        } else {
          firstAllowed.click();
        }
      }
    }
  }
  function init() {
    if (!location.pathname.endsWith('/admin.html')) return;
    addLanguageSwitcher();
    applyRoleNavigation();

    // Do not observe the whole Admin DOM. Navigation itself changes tab/panel
    // attributes, so a body-wide childList/subtree observer can repeatedly
    // re-enter applyRoleNavigation while the shell is rendering.
    // Role changes are represented by the single body data-role attribute.
    const roleObserver = new MutationObserver(() => applyRoleNavigation());
    roleObserver.observe(document.body, { attributes:true, attributeFilter:['data-role'] });

    window.addEventListener('azaadLanguageChanged', applyRoleNavigation);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
