(() => {
  'use strict';
  const WEBSITE_URL='https://magdy4287-beep.github.io/-azaad-clinic-website/';
  const MAPS_URL='https://maps.app.goo.gl/6kta6eBxN7TH88ATA?g_st=ic';
  const DEFAULT_WHATSAPP='201140526294';
  const $=id=>document.getElementById(id);
  const normalizeDigits=value=>String(value||'').replace(/\D/g,'');
  const getPublicData=()=>window.AZAAD_PUBLIC_CLINIC_DATA||{};
  const getSettings=()=>getPublicData().settings||{};
  const central=()=>window.AZAAD_I18N;
  const language=()=>central()?.language?.() === 'en' ? 'en' : 'ar';
  function setting(...keys){for(const key of keys){const value=getSettings()?.[key];if(value!==undefined&&value!==null&&String(value).trim())return String(value).trim();}return ''}
  const getWhatsApp=()=>normalizeDigits(setting('whatsapp','whatsapp_number','whatsapp_phone','phone_whatsapp')||DEFAULT_WHATSAPP);
  const getPhone=()=>setting('phone','phone_number','clinic_phone','contact_phone');
  const getEmail=()=>setting('email','clinic_email','contact_email');
  const getAddress=()=>{
    const settings=getSettings();
    if(language()==='en') return setting('address_en','clinic_address_en','location_en','clinic_location_en') || 'Damietta - Nafea Street, opposite Al-Mazloum Mosque, above Al-Riyad Pharmacy';
    return setting('address','clinic_address','location','clinic_location') || 'دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض';
  };
  function closeMobileMenu(){const nav=$('nav'),menu=$('menu');if(!nav)return;nav.classList.remove('mobile-open');if(menu){menu.setAttribute('aria-expanded','false');menu.textContent='☰'}}
  function setupMobileMenu(){const nav=$('nav'),menu=$('menu');if(!nav||!menu||menu.dataset.publicUiMenuBound==='true')return;menu.dataset.publicUiMenuBound='true';menu.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const open=nav.classList.toggle('mobile-open');menu.setAttribute('aria-expanded',open?'true':'false');menu.textContent=open?'✕':'☰'});nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMobileMenu));window.addEventListener('resize',()=>{if(window.innerWidth>900)closeMobileMenu()})}
  function updateContactLinks(){
    const whatsapp=getWhatsApp(),phone=getPhone(),email=getEmail(),address=getAddress(),lang=language();
    const phoneLink=$('phoneLink'),phoneText=$('contactPhone'),emailLink=$('emailLink'),emailText=$('contactEmail'),waLink=$('waLink'),waHero=$('waHero'),mapsLink=$('mapsLink'),shareLocation=$('shareLocation'),addressElement=$('address');
    if(phoneText)phoneText.textContent=phone||'—';
    if(emailText)emailText.textContent=email||'—';
    if(addressElement)addressElement.textContent=address;
    if(phoneLink)phoneLink.href=phone?`tel:${phone.replace(/[^\d+]/g,'')}`:'#contact';
    if(emailLink)emailLink.href=email?`mailto:${email}`:'#contact';
    const waMessage=lang==='en'?'Hello Azaad Clinic, I would like to ask about an appointment.':'مرحبًا عيادة أزاد، أود الاستفسار عن حجز موعد.';
    const waUrl=`https://wa.me/${whatsapp}?text=${encodeURIComponent(waMessage)}`;
    if(waLink)waLink.href=waUrl;if(waHero)waHero.href=waUrl;
    if(mapsLink){mapsLink.href=MAPS_URL;mapsLink.target='_blank';mapsLink.rel='noopener noreferrer'}
    if(shareLocation){const locationMessage=lang==='en'?`📍 Azaad Clinic location:\n${address}\n\n${MAPS_URL}`:`📍 موقع عيادة أزاد:\n${address}\n\n${MAPS_URL}`;shareLocation.onclick=()=>{window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(locationMessage)}`,'_blank','noopener,noreferrer')}}
  }
  function syncFromCentral(){
    const i18n=central();
    if(!i18n?.t)return;
    document.documentElement.lang=language();
    document.documentElement.dir=language()==='ar'?'rtl':'ltr';
    document.querySelectorAll('[data-lang]').forEach(button=>{const active=button.getAttribute('data-lang')===language();button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false')});
    const menu=$('menu');if(menu)menu.setAttribute('aria-label',language()==='ar'?'القائمة':'Menu');
    updateContactLinks();
  }
  function setupCentralLanguage(){
    syncFromCentral();
    window.addEventListener('azaadLanguageChanged',syncFromCentral);
    window.addEventListener('azaadPublicContentLanguageChanged',syncFromCentral);
  }
  function refreshPublicSettings(attempt=0){updateContactLinks();if(attempt>=10)return;if(!window.AZAAD_PUBLIC_CLINIC_DATA)window.setTimeout(()=>refreshPublicSettings(attempt+1),500)}
  function initialize(){setupMobileMenu();setupCentralLanguage();refreshPublicSettings();const year=$('year');if(year)year.textContent=String(new Date().getFullYear());for(const src of ['/public-team-display.js?v=2','/patient-booking-privacy-v2.js?v=2']){const s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
