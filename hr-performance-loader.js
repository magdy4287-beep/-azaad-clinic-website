/* AZAAD CLINIC — HR performance analytics loader */
(() => {
  'use strict';
  const load=()=>{if(window.__AZAAD_HR_PERFORMANCE_LOADED__)return;window.__AZAAD_HR_PERFORMANCE_LOADED__=true;const s=document.createElement('script');s.src='hr-performance-analytics.js?v=1';s.defer=true;document.head.appendChild(s)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
