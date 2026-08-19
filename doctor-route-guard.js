/* AZAAD CLINIC — DOCTOR ROUTE GUARD v4 */
(() => {
  'use strict';
  if (!/\/admin\.html$/i.test(location.pathname)) return;
  const SUPABASE_URL='https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY='sb_publishable_GC253fvQbNBsDOaKjWGRw_tPYJrgLa';
  const STORAGE_KEY='azaad-clinic-admin-auth';
  let clientPromise=null,redirectInProgress=false;
  function setAdminVisibility(show){const a=document.getElementById('adminPage'),l=document.getElementById('loginPage');if(a)a.classList.toggle('hidden',!show);if(l)l.classList.toggle('hidden',!!show)}
  function loadOperationsCenter(){if(document.getElementById('azaadOperationsScript'))return;const s=document.createElement('script');s.id='azaadOperationsScript';s.src='./azaad-operations-control-center.js?v=20260819-01';s.defer=true;document.head.appendChild(s);const g=document.createElement('script');g.id='azaadOperationsRoleGuard';g.src='./azaad-operations-role-guard.js?v=20260819-01';g.defer=true;document.head.appendChild(g)}
  async function getClient(){if(!clientPromise)clientPromise=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:STORAGE_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));return clientPromise}
  async function isDoctorSession(session){const token=session?.access_token;if(!token)return false;const r=await fetch(`${SUPABASE_URL}/functions/v1/azaad-admin-auth?_=${Date.now()}`,{headers:{Accept:'application/json',Authorization:`Bearer ${token}`,apikey:SUPABASE_KEY},cache:'no-store'});const b=await r.json().catch(()=>({}));const a=b?.admin||b?.staff||{};return r.ok&&a.active!==false&&String(a.role||'').trim().toUpperCase()==='DOCTOR'}
  async function handleAuthEvent(event,session){if(event!=='SIGNED_IN'||redirectInProgress)return;setAdminVisibility(false);try{if(await isDoctorSession(session)){redirectInProgress=true;location.replace('./doctor-dashboard.html?from=login');return}setAdminVisibility(true);loadOperationsCenter()}catch(e){console.warn('Azaad doctor route guard v4:',e)}}
  (async()=>{try{const supabase=await getClient();supabase.auth.onAuthStateChange((event,session)=>setTimeout(()=>handleAuthEvent(event,session),0));setTimeout(loadOperationsCenter,1200)}catch(e){console.warn('Azaad doctor route guard v4 init:',e)}})();
})();
