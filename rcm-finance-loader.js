/* AZAAD CLINIC — safe loader for RCM + Finance Center */
(() => {
  'use strict';
  const load = () => {
    if (window.__AZAAD_RCM_FINANCE_LOADED__) return;
    window.__AZAAD_RCM_FINANCE_LOADED__ = true;
    const s = document.createElement('script');
    s.src = 'rcm-finance-center.js?v=1';
    s.defer = true;
    document.head.appendChild(s);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once:true });
  else load();
})();
