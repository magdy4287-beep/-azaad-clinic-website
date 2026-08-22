(() => {
  'use strict';
  const MAPS_URL='https://maps.app.goo.gl/6kta6eBxN7TH88ATA?g_st=ic';
  const DEFAULT_WHATSAPP='201140526294';
  const LANGUAGE_KEY='azaadClinicLanguage';
  const $=id=>document.getElementById(id);
  const normalizeDigits=value=>String(value||'').replace(/\D/g,'');
  const getPublicData=()=>window.AZAAD_PUBLIC_CLINIC_DATA||{};
  const getSettings=()=>getPublicData().settings||{};
  const central=()=>window.AZAAD_I18N;
  const language=()=>central()?.language?.() || (localStorage.getItem(LANGUAGE_KEY)==='en'?'en':'ar');
  function setting(...keys){for(const key of keys){const value=getSettings()?.[key];if(value!==undefined&&value!==null&&String(value).trim())return String(value).trim();}return ''}
  const getWhatsApp=()=>normalizeDigits(setting('whatsapp','whatsapp_number','whatsapp_phone','phone_whatsapp')||DEFAULT_WHATSAPP);
  const getPhone=()=>setting('phone','phone_number','clinic_phone','contact_phone');
  const getEmail=()=>setting('email','clinic_email','contact_email');
  const getAddress=()=>{
    const ar=setting('address','clinic_address','location','clinic_location')||'دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض';
    if(language()!=='en') return ar;
    return setting('address_en','clinic_address_en','location_en','clinic_location_en')||'Damietta - Nafea Street, opposite Al-Mazloum Mosque, above Al-Riyad Pharmacy';
  };
  function closeMobileMenu(){const nav=$('nav'),menu=$('menu');if(!nav)return;nav.classList.remove('mobile-open');if(menu){menu.setAttribute('aria-expanded','false');menu.textContent='☰'}}
  function setupMobileMenu(){const nav=$('nav'),menu=$('menu');if(!nav||!menu||menu.dataset.publicUiMenuBound==='true')return;menu.dataset.publicUiMenuBound='true';menu.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const open=nav.classList.toggle('mobile-open');menu.setAttribute('aria-expanded',open?'true':'false');menu.textContent=open?'✕':'☰'});nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMobileMenu));window.addEventListener('resize',()=>{if(window.innerWidth>900)closeMobileMenu()})}
  function updateContactLinks(){
    const whatsapp=getWhatsApp(),phone=getPhone(),email=getEmail(),address=getAddress(),lang=language();
    const phoneLink=$('phoneLink'),phoneText=$('contactPhone'),emailLink=$('emailLink'),emailText=$('contactEmail'),waLink=$('waLink'),waHero=$('waHero'),mapsLink=$('mapsLink'),shareLocation=$('shareLocation'),addressElement=$('address');
    if(phoneText)phoneText.textContent=phone||'—'; if(emailText)emailText.textContent=email||'—'; if(addressElement){addressElement.textContent=address;addressElement.setAttribute('data-i18n','clinicAddress')}
    if(phoneLink)phoneLink.href=phone?`tel:${phone.replace(/[^\d+]/g,'')}`:'#contact'; if(emailLink)emailLink.href=email?`mailto:${email}`:'#contact';
    const waMessage=lang==='en'?'Hello Azaad Clinic, I would like to ask about an appointment.':'مرحبًا عيادة أزاد، أود الاستفسار عن حجز موعد.';
    const waUrl=`https://wa.me/${whatsapp}?text=${encodeURIComponent(waMessage)}`;
    if(waLink)waLink.href=waUrl; if(waHero)waHero.href=waUrl;
    if(mapsLink){mapsLink.href=MAPS_URL;mapsLink.target='_blank';mapsLink.rel='noopener noreferrer'}
    if(shareLocation && shareLocation.dataset.publicShareBound!=='true'){
      shareLocation.dataset.publicShareBound='true';
      shareLocation.addEventListener('click',async event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        const pageUrl=`${window.location.origin}${window.location.pathname}${window.location.search}`;
        const title=central()?.t?.('shareDataTitle') || (lang==='en'?'Azaad Clinic | Mental Health Clinic':'Azaad Clinic | عيادة آزاد للصحة النفسية');
        const text=central()?.t?.('shareDataText') || (lang==='en'?'🌐 Share Azaad Clinic website':'🌐 مشاركة الموقع الإلكتروني للعيادة');
        try{
          if(typeof navigator.share==='function'){
            await navigator.share({title,text,url:pageUrl});
            return;
          }
        }catch(error){
          if(error?.name==='AbortError')return;
        }
        try{
          await navigator.clipboard?.writeText(pageUrl);
          const message=central()?.t?.('copied') || (lang==='en'?'The clinic website link has been copied.':'تم نسخ رابط موقع العيادة الإلكتروني.');
          if(typeof window.alert==='function')window.alert(message);
          return;
        }catch(_){
          const promptText=central()?.t?.('prompt') || (lang==='en'?'Copy the clinic website link:':'انسخ رابط موقع العيادة الإلكتروني:');
          if(typeof window.prompt==='function')window.prompt(promptText,pageUrl);
        }
      },{passive:false});
    }
  }
  function syncFromCentral(){
    const lang=language();
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    document.querySelectorAll('[data-lang]').forEach(button=>{const active=button.getAttribute('data-lang')===lang;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false')});
    const menu=$('menu');if(menu)menu.setAttribute('aria-label',lang==='ar'?'القائمة':'Menu');
    updateContactLinks();
  }
  function bindCentralLanguageButtons(){
    if(document.documentElement.dataset.centralLanguageCaptureBound==='true')return;
    document.documentElement.dataset.centralLanguageCaptureBound='true';
    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('[data-lang]');if(!button)return;
      const target=button.getAttribute('data-lang');if(target!=='ar'&&target!=='en')return;
      event.preventDefault();event.stopImmediatePropagation();
      const c=central();
      if(typeof c?.setLanguage==='function')c.setLanguage(target);else localStorage.setItem(LANGUAGE_KEY,target);
      window.dispatchEvent(new CustomEvent('azaadLanguageChanged',{detail:{language:target}}));
    },true);
  }
  function setupCentralLanguage(){bindCentralLanguageButtons();syncFromCentral();window.addEventListener('azaadLanguageChanged',syncFromCentral);window.addEventListener('azaadPublicContentLanguageChanged',syncFromCentral)}
  function refreshPublicSettings(attempt=0){updateContactLinks();if(attempt>=10)return;if(!window.AZAAD_PUBLIC_CLINIC_DATA)window.setTimeout(()=>refreshPublicSettings(attempt+1),500)}
  function initialize(){setupMobileMenu();setupCentralLanguage();refreshPublicSettings();const year=$('year');if(year)year.textContent=String(new Date().getFullYear());for(const src of ['/public-team-display.js?v=3','/patient-booking-privacy-v2.js?v=3']){const s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
