(() => {
  'use strict';
  const bookingUrl=`${location.origin}${location.pathname}#booking`;
  const wa=()=>{const data=window.AZAAD_PUBLIC_CLINIC_DATA||{};return String(data.settings?.whatsapp||data.settings?.phone||'201140526294').replace(/\D/g,'')};
  function apply(){const a=document.getElementById('shareLocation');if(!a)return;const en=String(document.documentElement.lang||'ar').startsWith('en');const message=en?`📅 Book an appointment at Azaad Clinic:\n${bookingUrl}`:`📅 احجز موعدك من عيادة أزاد:\n${bookingUrl}`;a.href=`https://wa.me/${wa()}?text=${encodeURIComponent(message)}`;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',en?'Share direct booking link':'مشاركة رابط الحجز المباشر')}
  function boot(){apply();window.addEventListener('azaadLanguageChanged',apply)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
