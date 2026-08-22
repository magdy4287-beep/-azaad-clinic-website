(() => {
  'use strict';

  const CLINIC_API='https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';
  const POSTS_API='https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-content';
  const WEBSITE_URL='https://magdy4287-beep.github.io/-azaad-clinic-website/';
  const STATE='__AZAAD_CLINIC_POSTS_V7__';
  if(window[STATE]) return;

  const state={services:[],doctors:[],posts:[],started:false,shareObserver:null};
  window[STATE]=state;

  const i18n=()=>window.AZAAD_I18N;
  const lang=()=>i18n?.().language?.() || document.documentElement.lang?.startsWith('en') ? 'en' : 'ar';
  const t=k=>i18n?.().t?.(k) ?? k;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const safeUrl=v=>{try{const u=new URL(String(v||'').trim());return ['http:','https:'].includes(u.protocol)?u.href:'';}catch(_){return '';}};

  async function request(url){
    const c=new AbortController(); const timer=setTimeout(()=>c.abort(),20000);
    try{const r=await fetch(url,{cache:'no-store',signal:c.signal,headers:{Accept:'application/json'}});let d={};try{d=await r.json();}catch(_){}if(!r.ok)throw new Error(d?.error||d?.message||`HTTP ${r.status}`);return d;}
    finally{clearTimeout(timer);}
  }

  function serviceName(x){return lang()==='en'?(x?.name_en||x?.name||x?.title||x?.service_name||t('defaultService')):(x?.name||x?.title||x?.service_name||t('defaultService'));}
  function serviceDescription(x){return lang()==='en'?(x?.description_en||x?.description||x?.short_description||x?.details||t('defaultServiceDescription')):(x?.description||x?.short_description||x?.details||t('defaultServiceDescription'));}
  function doctorName(x){return lang()==='en'?(x?.name_en||x?.name||x?.full_name||x?.display_name||t('defaultDoctor')):(x?.name||x?.full_name||x?.display_name||t('defaultDoctor'));}
  function doctorTitle(x){return lang()==='en'?(x?.title_en||x?.title||x?.specialty||x?.specialization||t('defaultDoctorTitle')):(x?.title||x?.specialty||x?.specialization||t('defaultDoctorTitle'));}
  function doctorBio(x){return lang()==='en'?(x?.bio_en||x?.bio||x?.description||x?.short_bio||t('defaultDoctorBio')):(x?.bio||x?.description||x?.short_bio||t('defaultDoctorBio'));}
  function doctorImage(x){return safeUrl(x?.image_url||x?.photo_url||x?.avatar_url||x?.image||x?.photo);}

  function renderServices(){
    const grid=document.getElementById('servicesGrid'); if(!grid)return;
    if(!state.services.length){grid.innerHTML=`<div class="empty" style="grid-column:1/-1;text-align:center">${esc(t('servicesEmpty'))}</div>`;return;}
    grid.innerHTML=state.services.map(x=>`<article class="card clinic-service-card" style="height:100%;box-sizing:border-box"><div style="font-size:34px;margin-bottom:12px" aria-hidden="true">🩺</div><h3>${esc(serviceName(x))}</h3><p style="line-height:1.8;margin-bottom:0">${esc(serviceDescription(x))}</p>${x?.duration_minutes||x?.duration?`<div class="small-note" style="margin-top:10px;opacity:.8">⏱️ ${esc(x.duration_minutes??x.duration)} ${esc(t('durationMinute'))}</div>`:''}</article>`).join('');
  }

  function renderDoctors(){
    const grid=document.getElementById('doctorsGrid'); if(!grid)return;
    if(!state.doctors.length){grid.innerHTML=`<div class="empty" style="grid-column:1/-1;text-align:center">${esc(t('doctorsEmpty'))}</div>`;return;}
    grid.innerHTML=state.doctors.map(x=>{
      const name=doctorName(x), image=doctorImage(x);
      const photo=image?`<div class="clinic-doctor-media" style="width:100%;overflow:hidden;border-radius:18px;margin-bottom:16px;background:#f3f5f9"><img src="${esc(image)}" alt="${esc(name)}" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;object-fit:contain;object-position:center;border-radius:18px"></div>`:`<div style="width:100%;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;border-radius:18px;margin-bottom:16px;background:#f3f5f9;font-size:70px">🧑‍⚕️</div>`;
      return `<article class="card clinic-doctor-card" style="height:100%;box-sizing:border-box">${photo}<h3>${esc(name)}</h3><div style="font-weight:700;margin-top:6px;margin-bottom:10px">🧑‍⚕️ ${esc(doctorTitle(x))}</div><p style="line-height:1.8;margin-bottom:0">${esc(doctorBio(x))}</p></article>`;
    }).join('');
  }

  function postsSection(){
    let s=document.getElementById('clinicPosts'); if(s)return s;
    s=document.createElement('section');s.id='clinicPosts';s.className='section section-light';
    s.innerHTML=`<div class="container"><div class="eyebrow" data-posts-i18n="postsEyebrow"></div><h2 data-posts-i18n="postsTitle"></h2><p class="section-intro" data-posts-i18n="postsIntro"></p><div id="clinicPostsGrid" class="cards"></div></div>`;
    const main=document.querySelector('main'),booking=document.getElementById('booking');
    if(booking?.parentNode)booking.parentNode.insertBefore(s,booking);else if(main)main.appendChild(s);
    return s;
  }

  function renderPosts(){
    const s=postsSection(),grid=document.getElementById('clinicPostsGrid');if(!s||!grid)return;
    s.querySelector('[data-posts-i18n="postsEyebrow"]').textContent=t('postsEyebrow');
    s.querySelector('[data-posts-i18n="postsTitle"]').textContent=t('postsTitle');
    s.querySelector('[data-posts-i18n="postsIntro"]').textContent=t('postsIntro');
    if(!state.posts.length){s.style.display='none';return;} s.style.display='';
    grid.innerHTML=state.posts.map(p=>{
      const title=lang()==='en'?(p?.title_en||p?.title||t('defaultPostTitle')):(p?.title||t('defaultPostTitle'));
      const content=lang()==='en'?(p?.content_en||p?.content||''):(p?.content||'');
      const date=p?.published_at?new Date(p.published_at).toLocaleDateString(lang()==='en'?'en-US':'ar-EG',{year:'numeric',month:'long',day:'numeric'}):'';
      let media=''; const u=safeUrl(p?.media_url);
      if(u&&p.media_type==='image')media=`<div class="clinic-post-media" style="width:100%;overflow:hidden;border-radius:14px;margin-bottom:16px"><img src="${esc(u)}" alt="${esc(title)}" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;max-height:none;object-fit:contain;object-position:center;border-radius:14px"></div>`;
      if(u&&p.media_type==='video')media=`<div class="clinic-post-media" style="width:100%;overflow:hidden;border-radius:14px;margin-bottom:16px"><video controls preload="metadata" playsinline style="display:block;width:100%;height:auto;max-height:420px;border-radius:14px;background:#000"><source src="${esc(u)}">${esc(t('videoUnsupported'))}</video></div>`;
      const more=safeUrl(p?.external_url);return `<article class="card clinic-post-card" style="overflow:hidden">${media}<div>${date?`<div class="small-note" style="margin-bottom:8px">${esc(date)}</div>`:''}<h3>${esc(title)}</h3>${content?`<p>${esc(content)}</p>`:''}${more?`<a href="${esc(more)}" target="_blank" rel="noopener noreferrer" class="btn">${esc(t('postMore'))}</a>`:''}</div></article>`;
    }).join('');
  }

  async function load(){
    try{const d=await request(`${CLINIC_API}?api=data&_=${Date.now()}`);state.services=Array.isArray(d?.services)?d.services:[];state.doctors=Array.isArray(d?.doctors)?d.doctors:[];state.settings=d?.settings||{};window.AZAAD_PUBLIC_CLINIC_DATA={services:state.services,doctors:state.doctors,settings:state.settings};renderServices();renderDoctors();}
    catch(e){console.warn('Azaad public clinic data:',e);const a=document.getElementById('servicesGrid'),b=document.getElementById('doctorsGrid');if(a)a.innerHTML=`<div class="empty" style="grid-column:1/-1;white-space:pre-line">${esc(t('servicesError'))}</div>`;if(b)b.innerHTML=`<div class="empty" style="grid-column:1/-1;white-space:pre-line">${esc(t('doctorsError'))}</div>`;}
    try{const d=await request(`${POSTS_API}?t=${Date.now()}`);state.posts=(Array.isArray(d?.posts)?d.posts:[]).filter(p=>p&&p.published===true).sort((a,b)=>new Date(b.published_at||b.created_at||0)-new Date(a.published_at||a.created_at||0));renderPosts();}catch(e){console.warn('Azaad public posts:',e);}
  }

  async function share(){const data={title:t('shareDataTitle'),text:t('shareDataText'),url:WEBSITE_URL};try{if(navigator.share){await navigator.share(data);return true;}}catch(e){if(e?.name==='AbortError')return false;}try{await navigator.clipboard.writeText(WEBSITE_URL);alert(t('copied'));return true;}catch(_){}window.prompt(t('prompt'),WEBSITE_URL);return false;}
  function setupShare(){const b=document.getElementById('shareLocation');if(!b)return;b.removeAttribute('href');b.removeAttribute('target');b.removeAttribute('rel');b.type='button';b.textContent=t('shareButton');b.setAttribute('aria-label',t('shareAria'));if(b.dataset.centralShareBound==='true')return;b.dataset.centralShareBound='true';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();share();});}
  function refresh(){renderServices();renderDoctors();if(state.posts.length)renderPosts();setupShare();}

  window.AZAAD_PUBLIC_CONTENT={version:'7.0.0',refresh,getLanguage:lang};
  window.addEventListener('azaadLanguageChanged',refresh);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',async()=>{if(state.started)return;state.started=true;setupShare();await load();refresh();},{once:true});
  else if(!state.started){state.started=true;setupShare();load().then(refresh);}
})();
