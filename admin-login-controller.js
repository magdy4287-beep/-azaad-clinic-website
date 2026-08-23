/* AZAAD Admin Login Controller
 * Resilient login adapter. Authentication remains real: staff-login -> Supabase setSession.
 * This controller must never prevent the rest of the admin UI from loading.
 */
(function installAzaadAdminLoginController(){
  const SUPABASE_URL='https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const SUPABASE_AUTH_STORAGE_KEY='azaad-clinic-admin-auth';
  const STAFF_LOGIN_FUNCTION=`${SUPABASE_URL}/functions/v1/staff-login`;
  const SUPABASE_READY_TIMEOUT_MS=20000;
  let disposed=false,installed=false,supabase=null;

  const safeDispatch=(name,detail)=>{try{window.dispatchEvent(new CustomEvent(name,{detail}));}catch(_) {}};
  const supabaseReady=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>{
    supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storage:window.localStorage,storageKey:SUPABASE_AUTH_STORAGE_KEY}});
    window.AZAAD=window.AZAAD||{};window.AZAAD.supabase=supabase;window.AZAAD_SUPABASE_READY=true;safeDispatch('azaad:supabase-ready');return supabase;
  }).catch(error=>{console.error('Azaad Supabase client initialization failed',error);return null;});

  function prepareForm(){try{if(disposed)return false;const form=document.getElementById('loginForm');if(!form)return false;form.noValidate=true;if(!window.AZAAD_LOGIN_CONTROLLER_READY){window.AZAAD_LOGIN_CONTROLLER_READY=true;safeDispatch('azaad:login-controller-ready');}return true;}catch(error){console.warn('Azaad login controller prepare failed',error);return false;}}
  async function waitForSupabase(){let timeoutId;try{return await Promise.race([supabaseReady,new Promise((_,reject)=>{timeoutId=setTimeout(()=>reject(new Error('انتهت مهلة تهيئة تسجيل الدخول.')),SUPABASE_READY_TIMEOUT_MS);})]);}finally{if(timeoutId)clearTimeout(timeoutId);}}

  async function authenticate(event){
    if(disposed)return;const form=event?.target;if(!form||form.id!=='loginForm')return;
    event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
    const username=String(form.querySelector('#username')?.value||'').trim().toLowerCase(),password=String(form.querySelector('#password')?.value||'');
    const errorBox=document.getElementById('loginError'),button=form.querySelector('button[type="submit"]');
    if(errorBox){errorBox.textContent='';errorBox.classList.add('hidden');}
    if(!username||!password){if(errorBox){errorBox.textContent=!username?'اسم المستخدم مطلوب.':'كلمة المرور مطلوبة.';errorBox.classList.remove('hidden');}return;}
    if(button)button.disabled=true;
    try{
      const client=await waitForSupabase();if(!client)throw new Error('تعذر تهيئة خدمة تسجيل الدخول.');
      const response=await fetch(STAFF_LOGIN_FUNCTION,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({username,password})});
      let result={};try{result=await response.json();}catch(_){}if(!response.ok)throw new Error(result?.error||result?.message||`HTTP ${response.status}`);
      if(!result?.session?.access_token||!result?.session?.refresh_token)throw new Error('تعذر إنشاء جلسة تسجيل الدخول.');
      if(!result?.staff||result.staff.active===false)throw new Error('حساب الموظف غير فعال أو غير مكتمل.');
      const {error}=await client.auth.setSession({access_token:result.session.access_token,refresh_token:result.session.refresh_token});if(error)throw error;
      const persisted=await client.auth.getSession();if(!persisted?.data?.session?.access_token)throw new Error('تعذر تثبيت جلسة Supabase.');
      try{sessionStorage.setItem('azaad_admin_token',persisted.data.session.access_token);}catch(_){}
      document.getElementById('loginPage')?.classList.add('hidden');document.getElementById('adminPage')?.classList.remove('hidden');safeDispatch('azaad:authenticated',{staff:result.staff,user:result.user||null});
      setTimeout(()=>{try{window.location.reload();}catch(_){}},50);
    }catch(error){console.error('Azaad admin login failed',error);if(errorBox){errorBox.textContent=error?.message||'تعذر تسجيل الدخول. حاول مرة أخرى.';errorBox.classList.remove('hidden');}}
    finally{if(button)button.disabled=false;}
  }
  function install(){try{if(disposed||installed)return;const form=document.getElementById('loginForm');if(!form)return;form.noValidate=true;window.addEventListener('submit',authenticate,true);installed=true;prepareForm();}catch(error){console.warn('Azaad login controller install failed',error);}}
  try{install();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});}catch(error){console.warn('Azaad login controller startup failed',error);}
  try{const observer=new MutationObserver(()=>{try{prepareForm();if(!installed)install();}catch(error){console.warn('Azaad login observer failed',error);}});observer.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('pagehide',()=>{disposed=true;try{window.removeEventListener('submit',authenticate,true);observer.disconnect();}catch(_){}},{once:true});}catch(error){console.warn('Azaad login observer unavailable',error);}
})();