/* AZAAD CLINIC — PATIENT SESSION BRIDGE v5.1.0 */
(() => {
  'use strict';
  const SESSION_KEY = 'azaad_admin_token';
  const ADMIN_FUNCTION = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-admin';
  const I18N_STABILITY_SCRIPT = './central-i18n-stability.js?v=2026.08.16.1';
  const I18N_SCRIPT = './central-i18n.js?v=2026.08.14.2';
  const ENHANCEMENTS_SCRIPT = './admin-enhancements-v1.js?v=2026.08.14.2';
  const PATIENT360_CHECKIN_SCRIPT = './patient360-checkin-ui.js?v=2026.08.16.1';
  const PATIENT360_PAYMENT_SCRIPT = './patient360-payment-ui.js?v=2026.08.16.2';
  let restorePromise = null;
  let booted = false;
  const permissionMap = { OWNER:['dashboard.view','bookings.view','patients.view','followups.view','marketing.view','finance.view','staff.view'], ADMIN:['dashboard.view','bookings.view','patients.view','followups.view','marketing.view','finance.view','staff.view'], MANAGER:['dashboard.view','bookings.view','patients.view','followups.view','marketing.view','finance.view','staff.view'], SECRETARY:['dashboard.view','bookings.view','followups.view','patients.view'], CASHIER:['dashboard.view','finance.view'], RECEPTION:['dashboard.view','bookings.view','followups.view','patients.view'], DOCTOR:['dashboard.view','bookings.view','patients.view','followups.view'], MARKETING:['dashboard.view','marketing.view'] };
  const waitForAzaad=async(a=0)=>{if(window.AZAAD?.supabase?.auth)return true;if(a>=100)return false;await new Promise(r=>setTimeout(r,50));return waitForAzaad(a+1)};
  function publish(s){if(!s?.access_token)return;window.AZAAD=window.AZAAD||{};window.AZAAD.state=window.AZAAD.state||{};window.AZAAD.state.session=s;window.AZAAD.state.user=s.user||null;try{sessionStorage.setItem(SESSION_KEY,s.access_token)}catch(_) {}}
  async function syncAuth(){const ready=await waitForAzaad();if(!ready)return null;try{const {data,error}=await window.AZAAD.supabase.auth.getSession();if(error||!data?.session?.access_token)return null;publish(data.session);return data.session}catch(e){console.warn('Azaad session sync:',e);return null}}
  async function restoreAdminInternal(){if(booted)return true;const ready=await waitForAzaad();if(!ready)return false;const c=window.AZAAD,client=c?.supabase,state=c?.state;if(!client?.auth||!state)return false;const session=await syncAuth();if(!session?.access_token||!session?.user?.id)return false;try{const r=await fetch(`${ADMIN_FUNCTION}?api=account&_=${Date.now()}`,{headers:{Accept:'application/json',Authorization:`Bearer ${session.access_token}`,apikey:'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa'},cache:'no-store'});let body=null;try{body=await r.json()}catch(_){}if(!r.ok||!body?.admin)return false;const staff=body.admin,role=String(staff.role||'').toUpperCase().trim();if(!staff.active||!permissionMap[role])return false;state.session=session;state.user=session.user;state.staff=staff;state.role=role;state.currentRole=role;state.permissions=new Set(permissionMap[role]);document.getElementById('loginPage')?.classList.add('hidden');document.getElementById('adminPage')?.classList.remove('hidden');if(typeof c.refresh==='function'){try{await c.refresh()}catch(e){console.warn('Admin refresh:',e)}}state.initialized=true;booted=true;return true}catch(e){console.error('Admin restore error:',e);return false}}
  function restoreAdmin(){if(booted)return Promise.resolve(true);if(!restorePromise)restorePromise=restoreAdminInternal().finally(()=>{restorePromise=null});return restorePromise}
  async function protectStartupSignOut(){const ready=await waitForAzaad();if(!ready)return;const auth=window.AZAAD?.supabase?.auth;if(!auth||auth.__azaadOriginalSignOut)return;const original=auth.signOut.bind(auth);auth.__azaadOriginalSignOut=original;auth.__azaadStartupGuard=true;auth.signOut=async(...args)=>auth.__azaadStartupGuard?{data:{},error:null}:original(...args);window.setTimeout(()=>{if(!booted&&auth.__azaadStartupGuard){auth.__azaadStartupGuard=false;auth.signOut=auth.__azaadOriginalSignOut}},15000)}
  window.AZAAD_AUTH_READY=restoreAdmin();
  window.AZAAD_PATIENT_SESSION={version:'5.1.0',getAccessToken:async()=>{const s=await syncAuth();if(s?.access_token)return s.access_token;try{return sessionStorage.getItem(SESSION_KEY)||''}catch(_){return ''}},getSession:syncAuth,refresh:syncAuth,restoreAdmin};
  function loadScriptOnce(src,key){if(document.querySelector(`script[data-azaad-script="${key}"]`))return;const s=document.createElement('script');s.src=src;s.defer=true;s.dataset.azaadScript=key;document.head.appendChild(s)}
  const loadAdminEnhancements=()=>{if(!/admin\.html$/i.test(location.pathname)||window.__AZAAD_ADMIN_ENHANCEMENTS__)return;loadScriptOnce(ENHANCEMENTS_SCRIPT,'__AZAAD_ADMIN_ENHANCEMENTS__')};
  const loadPatient360Checkin=()=>{if(!/admin\.html$/i.test(location.pathname))return;loadScriptOnce(PATIENT360_CHECKIN_SCRIPT,'__AZAAD_PATIENT360_CHECKIN__')};
  const loadPatient360Payment=()=>{if(!/admin\.html$/i.test(location.pathname))return;loadScriptOnce(PATIENT360_PAYMENT_SCRIPT,'__AZAAD_PATIENT360_PAYMENT__')};
  const loadI18nStability=()=>loadScriptOnce(I18N_STABILITY_SCRIPT,'__AZAAD_CENTRAL_I18N_STABILITY__');
  const loadCentralI18n=()=>loadScriptOnce(I18N_SCRIPT,'__AZAAD_CENTRAL_I18N__');
  const boot=async()=>{loadI18nStability();loadCentralI18n();loadAdminEnhancements();loadPatient360Checkin();loadPatient360Payment();protectStartupSignOut();const ready=await waitForAzaad();if(!ready)return;await restoreAdmin();try{await window.AZAAD_AUTH_READY}catch(_){}};
  window.addEventListener('pageshow',()=>{if(!booted)restoreAdmin()});window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!booted)restoreAdmin()});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
