(() => {
  'use strict';
  const PUBLIC_LOOKUP='https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-patient-lookup';
  const OLD_LOOKUP='https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-patient-lookup';
  const original=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:(input?.url||'');
    if(url.startsWith(OLD_LOOKUP)){
      const next=url.replace(OLD_LOOKUP,PUBLIC_LOOKUP);
      const response=await original(next,init);
      try{
        const clone=response.clone();const body=await clone.json();
        if(body?.found){
          return new Response(JSON.stringify({found:true,patient:{id:body.patient?.id,active:true}}),{status:response.status,headers:response.headers});
        }
      }catch(_){}
      return response;
    }
    return original(input,init);
  };
  const style=document.createElement('style');style.textContent='#azaadPatientBookingGate .azaad-patient-meta{display:none!important}#azaadPatientBookingGate .azaad-upcoming{display:none!important}#azaadPatientBookingGate .azaad-patient-card strong{display:block}';document.head.appendChild(style);
})();
