/* AZAAD CLINIC — Finance period analytics loader */
(() => {
  'use strict';
  const load=()=>{if(window.__AZAAD_FINANCE_PERIOD_LOADED__)return;window.__AZAAD_FINANCE_PERIOD_LOADED__=true;const s=document.createElement('script');s.src='finance-executive-annual-monthly.js?v=1';s.defer=true;document.head.appendChild(s)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
