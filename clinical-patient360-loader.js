/* AZAAD CLINIC — Patient 360 loader */
(() => {
  'use strict';
  const loadScript=(src,flag)=>{
    if(window[flag])return;
    window[flag]=true;
    const s=document.createElement('script');
    s.src=src;
    s.defer=true;
    document.head.appendChild(s);
  };
  const load=()=>{
    loadScript('clinical-patient360.js?v=2','__AZAAD_PATIENT360_LOADED__');
    loadScript('patient-appointment-actions.js?v=3','__AZAAD_PATIENT_APPOINTMENT_ACTIONS_LOADED__');
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
