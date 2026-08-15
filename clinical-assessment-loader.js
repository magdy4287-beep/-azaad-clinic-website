/* AZAAD CLINIC — Clinical Assessment loader */
(() => {
  'use strict';
  const load=()=>{if(window.__AZAAD_CLINICAL_ASSESSMENT_LOADED__)return;window.__AZAAD_CLINICAL_ASSESSMENT_LOADED__=true;const s=document.createElement('script');s.src='clinical-assessment-engine.js?v=1';s.defer=true;document.head.appendChild(s)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
