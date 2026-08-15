/* AZAAD CLINIC — Marketing Intelligence loader */
(() => {
  'use strict';
  const load=()=>{if(window.__AZAAD_MARKETING_INTELLIGENCE_LOADED__)return;window.__AZAAD_MARKETING_INTELLIGENCE_LOADED__=true;const s=document.createElement('script');s.src='marketing-intelligence-dashboard.js?v=1';s.defer=true;document.head.appendChild(s)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
