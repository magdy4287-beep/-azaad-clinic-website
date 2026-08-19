/* AZAAD Role Experience + responsive navigation
   UI visibility is convenience only. Every protected operation remains
   authorized server-side by Supabase/Auth/RLS/Edge Functions. */
(() => {
  'use strict';

  const ROLE_PANELS = {
    OWNER: ['bookings','doctors','services','schedules','posts','holidays','hours','staff','settings','account'],
    ADMIN: ['bookings','doctors','services','schedules','posts','holidays','hours','staff','settings','account'],
    MANAGER: ['bookings','doctors','services','schedules','posts','holidays','hours','staff','settings','account'],
    SECRETARY: ['bookings'],
    RECEPTION: ['bookings'],
    CASHIER: ['bookings'],
    MARKETING: ['posts']
  };

  const ROLE_LABELS = {
    OWNER: '👑 Owner', ADMIN: '🛡️ Admin', MANAGER: '👨‍💼 Manager',
    SECRETARY: '👩‍💼 Secretary', RECEPTION: '🧑‍💼 Reception',
    CASHIER: '💰 Cashier', MARKETING: '📣 Marketing', DOCTOR: '🧑‍⚕️ Doctor'
  };

  function role() {
    return String(document.body.dataset.role || '').toUpperCase().trim();
  }

  function addLanguageSwitcher() {
    if (document.getElementById('azaadLanguageSwitcher')) return;
    const host = document.querySelector('.top-actions') || document.querySelector('.topbar');
    if (!host) return;
    const wrap = document.createElement('div');
    wrap.id = 'azaadLanguageSwitcher';
    wrap.className = 'azaad-language-switcher';
    wrap.setAttribute('aria-label', 'Language');
    wrap.innerHTML = `
      <button type="button" class="btn btn-secondary" data-lang="ar" aria-label="العربية">عربي</button>
      <button type="button" class="btn btn-secondary" data-lang="en" aria-label="English">English</button>`;
    host.prepend(wrap);
    wrap.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => {
      window.AZAAD_I18N?.setLanguage?.(btn.dataset.lang);
    }));
  }

  function applyRoleNavigation() {
    const current = role();
    if (!current || current === 'DOCTOR') return;
    const allowed = new Set(ROLE_PANELS[current] || []);
    document.querySelectorAll('.tabs .tab[data-panel]').forEach(tab => {
      const panel = tab.dataset.panel;
      const visible = allowed.has(panel);
      tab.hidden = !visible;
      tab.setAttribute('aria-hidden', visible ? 'false' : 'true');
      const target = document.getElementById(panel);
      if (target) target.hidden = !visible;
    });

    const active = document.querySelector('.tabs .tab.active:not([hidden])');
    if (!active) {
      const first = document.querySelector('.tabs .tab:not([hidden])');
      if (first) first.click();
    }

    document.body.dataset.roleLabel = ROLE_LABELS[current] || current;
  }

  function improveMobileNav() {
    const tabs = document.querySelector('.tabs');
    if (!tabs || tabs.dataset.azaadResponsiveBound === 'true') return;
    tabs.dataset.azaadResponsiveBound = 'true';
    tabs.setAttribute('data-azaad-responsive', 'critical');
  }

  function init() {
    if (!location.pathname.endsWith('/admin.html')) return;
    addLanguageSwitcher();
    applyRoleNavigation();
    improveMobileNav();
    const observer = new MutationObserver(() => {
      if (document.body.dataset.role) applyRoleNavigation();
      if (!document.getElementById('azaadLanguageSwitcher')) addLanguageSwitcher();
    });
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    window.addEventListener('azaadLanguageChanged', () => {
      // Central I18N owns translation; this layer only restores role-safe navigation.
      applyRoleNavigation();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
