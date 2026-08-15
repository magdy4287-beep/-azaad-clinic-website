/* AZAAD CLINIC — Patient 360 loader */
(() => {
  'use strict';
  const load=()=>{if(window.__AZAAD_PATIENT360_LOADED__)return;window.__AZAAD_PATIENT360_LOADED__=true;const s=document.createElement('script');s.src='clinical-patient360.js?v=1';s.defer=true;document.head.appendChild(s)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
