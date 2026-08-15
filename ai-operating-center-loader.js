/* AZAAD CLINIC — AI Operating Center loader */
(() => {
  'use strict';
  const load=()=>{if(window.__AZAAD_AI_OPERATING_LOADED__)return;window.__AZAAD_AI_OPERATING_LOADED__=true;const s=document.createElement('script');s.src='ai-operating-center.js?v=1';s.defer=true;document.head.appendChild(s)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
