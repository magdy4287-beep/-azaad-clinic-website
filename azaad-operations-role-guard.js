(() => {
  'use strict';
  const URL='https://derofsthjivlkcdnojww.supabase.co';
  const KEY='sb_publishable_GC253fvQbNBsDOaKjWGRw_tPYJrgLa';
  async function boot(){
    const c=window.AZAAD?.supabase||window.supabaseClient||window.supabase;
    if(!c)return;
    const s=(await c.auth.getSession()).data.session;if(!s)return;
    const staff=(await c.from('clinic_staff').select('role').eq('auth_user_id',s.user.id).maybeSingle()).data;
    const role=String(staff?.role||'').toUpperCase();
    const root=document.getElementById('azaadOps');if(!root)return;
    if(role==='DOCTOR'){
      const form=document.getElementById('opsExpenseForm')?.closest('.azaad-ops-card');
      if(form)form.remove();
      document.getElementById('opsCloseDay')?.remove();
      document.getElementById('opsPrint')?.remove();
    }
    const bar=root.querySelector('.azaad-ops-toolbar');
    if(bar&&!document.getElementById('azaadGlobalCalendar')){
      const box=document.createElement('div');box.id='azaadGlobalCalendar';box.className='azaad-ops-card';box.innerHTML='<b>📅 Calendar</b><input id="azaadGlobalCalendarDate" class="azaad-ops-input" type="date" style="max-width:190px;margin-inline-start:8px"><span id="azaadGlobalCalendarTime" class="azaad-clock" style="margin-inline-start:8px"></span>';
      root.insertBefore(box,root.children[1]||null);
      document.getElementById('azaadGlobalCalendarDate').value=new Date().toISOString().slice(0,10);
      setInterval(()=>{const x=document.getElementById('azaadGlobalCalendarTime');if(x)x.textContent=new Intl.DateTimeFormat(document.documentElement.lang?.startsWith('en')?'en-EG':'ar-EG',{dateStyle:'medium',timeStyle:'medium'}).format(new Date())},1000);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
})();
