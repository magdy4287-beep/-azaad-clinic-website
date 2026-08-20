/* AZAAD CLINIC — DOCTOR ROUTE GUARD v5 */
(() => {
  'use strict';
  if (!/\/admin\.html$/i.test(location.pathname)) return;

  const SUPABASE_URL='https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY='sb_publishable_GC253fvQbNBsDOaKjWGRw_tPYJrgLa';
  let clientPromise=null;
  let redirectInProgress=false;

  function setAdminVisibility(show){
    const admin=document.getElementById('adminPage');
    const login=document.getElementById('loginPage');
    if(admin) admin.classList.toggle('hidden',!show);
    if(login) login.classList.toggle('hidden',!!show);
  }

  function loadOperationsCenter(){
    if(document.getElementById('azaadOperationsScript')) return;
    const script=document.createElement('script');
    script.id='azaadOperationsScript';
    script.src='./azaad-operations-control-center.js?v=20260819-01';
    script.defer=true;
    document.head.appendChild(script);

    const guard=document.createElement('script');
    guard.id='azaadOperationsRoleGuard';
    guard.src='./azaad-operations-role-guard.js?v=20260819-01';
    guard.defer=true;
    document.head.appendChild(guard);
  }

  async function getClient(){
    if(window.AZAAD?.supabase) return window.AZAAD.supabase;
    if(!clientPromise){
      clientPromise=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient}) =>
        createClient(SUPABASE_URL,SUPABASE_KEY,{
          auth:{
            persistSession:true,
            autoRefreshToken:true,
            detectSessionInUrl:false
          }
        })
      );
    }
    return clientPromise;
  }

  async function isDoctorSession(session){
    const token=session?.access_token;
    if(!token) return false;
    try{
      const response=await fetch(`${SUPABASE_URL}/functions/v1/azaad-admin-auth?_=${Date.now()}`,{
        headers:{
          Accept:'application/json',
          Authorization:`Bearer ${token}`,
          apikey:SUPABASE_KEY
        },
        cache:'no-store'
      });
      const body=await response.json().catch(() => ({}));
      const staff=body?.admin || body?.staff || {};
      return response.ok && staff.active !== false && String(staff.role || '').trim().toUpperCase() === 'DOCTOR';
    }catch(_){
      return false;
    }
  }

  async function handleAuthEvent(event,session){
    if(event!=='SIGNED_IN' || redirectInProgress) return;
    try{
      if(await isDoctorSession(session)){
        redirectInProgress=true;
        location.replace('./doctor-dashboard.html?from=login');
        return;
      }
      setAdminVisibility(true);
      loadOperationsCenter();
    }catch(e){
      console.warn('Azaad doctor route guard v5:',e);
      setAdminVisibility(true);
    }
  }

  (async()=>{
    try{
      const supabase=await getClient();
      supabase.auth.onAuthStateChange((event,session)=>setTimeout(()=>handleAuthEvent(event,session),0));
      setTimeout(loadOperationsCenter,1200);
    }catch(e){
      console.warn('Azaad doctor route guard v5 init:',e);
      setAdminVisibility(true);
    }
  })();
})();
