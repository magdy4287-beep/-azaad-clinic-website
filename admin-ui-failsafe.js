/* Azaad Admin UI fail-safe.
 * Keeps navigation/logout responsive if the primary admin controller fails before binding handlers.
 * It does not bypass authentication or data permissions.
 */
(function(){
  'use strict';
  function byId(id){return document.getElementById(id)}
  function bind(){
    try{
      document.querySelectorAll('.tab[data-panel]').forEach(function(btn){
        if(btn.dataset.failsafeBound==='1')return;
        btn.dataset.failsafeBound='1';
        btn.addEventListener('click',function(){
          var panel=btn.dataset.panel;
          document.querySelectorAll('.tab[data-panel]').forEach(function(x){x.classList.toggle('active',x===btn)});
          document.querySelectorAll('.panel').forEach(function(x){x.classList.toggle('active',x.id===panel)});
        },false);
      });
      var logout=byId('logoutBtn');
      if(logout&&!logout.dataset.failsafeBound){
        logout.dataset.failsafeBound='1';
        logout.addEventListener('click',function(){
          try{sessionStorage.removeItem('azaad_admin_token')}catch(_){}
          try{localStorage.removeItem('azaad-clinic-admin-auth')}catch(_){}
          try{localStorage.removeItem('sb-azaad-clinic-admin-auth-token')}catch(_){}
          window.location.replace(window.location.pathname+'?logged_out=1');
        },false);
      }
      var site=byId('siteBtn');
      if(site&&!site.dataset.failsafeBound){site.dataset.failsafeBound='1';site.addEventListener('click',function(){var url=site.dataset.url||window.location.origin+'/';window.open(url,'_blank','noopener,noreferrer')},false)}
      var refresh=byId('refreshBtn');
      if(refresh&&!refresh.dataset.failsafeBound){refresh.dataset.failsafeBound='1';refresh.addEventListener('click',function(){window.location.reload()},false)}
      var refreshBookings=byId('refreshBookings');
      if(refreshBookings&&!refreshBookings.dataset.failsafeBound){refreshBookings.dataset.failsafeBound='1';refreshBookings.addEventListener('click',function(){window.location.reload()},false)}
    }catch(error){console.warn('Azaad admin UI fail-safe binding failed',error)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:false});else bind();
  setTimeout(bind,250);setTimeout(bind,1000);setTimeout(bind,2500);
})();