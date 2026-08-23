/* AZAAD PUBLIC EXPERIENCE HARDENING
 * Safe UX/data-owner layer. Central public clinic data owns public doctors,
 * services and posts. Intentionally does not own translations, authentication,
 * booking payloads, or scheduling rules.
 */
(() => {
  'use strict';

  const CLINIC_API = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-clinic-data';
  const STATE = '__AZAAD_PUBLIC_EXPERIENCE_HARDENING_V2__';
  if (window[STATE]) return;
  window[STATE] = true;

  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'
  }[c]));
  const safeUrl = (v) => {
    try {
      const u = new URL(String(v || '').trim());
      return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
    } catch (_) { return ''; }
  };
  const textKey = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const identity = (item, type) => {
    const id = item?.id ?? item?.doctor_id ?? item?.service_id ?? item?.post_id;
    if (id != null && String(id).trim()) return `${type}:id:${String(id).trim()}`;
    const name = item?.name || item?.name_en || item?.title || item?.title_en || item?.full_name || item?.display_name || '';
    const media = item?.image_url || item?.photo_url || item?.avatar_url || item?.media_url || '';
    return `${type}:fallback:${textKey(name)}:${safeUrl(media)}`;
  };
  const unique = (items, type) => {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).filter(item => {
      const key = identity(item, type);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const lang = () => String(document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  const localText = (item, arKey, enKey) => lang() === 'en' ? (item?.[enKey] || item?.[arKey] || '') : (item?.[arKey] || item?.[enKey] || '');

  /* The supplied Azaad logo artwork, expressed as a lightweight inline SVG so
     the public page does not depend on an external image host or paid asset CDN. */
  const logoSvg = (className = 'azaad-logo-art', compact = false) => `
    <svg class="${className}" viewBox="0 0 420 420" role="img" aria-label="Azaad Psychotherapy" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="azLogoBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff0e9"/><stop offset="0.52" stop-color="#f7e6f1"/><stop offset="1" stop-color="#dff5f4"/>
        </linearGradient>
        <linearGradient id="azLogoCoral" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f06f72"/><stop offset="1" stop-color="#e85f6a"/></linearGradient>
        <filter id="azLogoShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#172b68" flood-opacity=".18"/></filter>
      </defs>
      <circle cx="210" cy="210" r="202" fill="url(#azLogoBg)" stroke="#fff" stroke-width="8"/>
      <g filter="url(#azLogoShadow)">
        <path d="M108 150 C142 105 182 82 216 105 C190 115 172 134 158 154 C139 178 119 181 96 166 C101 160 104 155 108 150Z" fill="url(#azLogoCoral)"/>
        <path d="M106 176 C142 204 174 188 191 150 C202 126 213 108 232 93 C223 126 224 155 207 181 C190 207 160 218 132 208 C118 203 108 192 100 183Z" fill="#172b68"/>
        <path d="M278 110 C313 101 340 91 363 73 C351 109 333 128 302 135 C286 139 274 131 266 120 C269 116 273 113 278 110Z" fill="#172b68"/>
        <path d="M239 126 L263 150 L239 174 L215 150 Z" fill="#172b68"/>
        <path d="M174 202 C147 226 123 245 118 277 C113 309 139 329 169 317 C195 306 202 281 190 258 C184 245 174 232 162 221 C171 214 179 208 187 203 C183 201 179 201 174 202Z" fill="#172b68"/>
        <path d="M246 181 C236 207 229 237 230 269 C231 300 216 324 188 343 C229 333 251 310 254 280 C257 249 251 219 260 190 C256 186 251 183 246 181Z" fill="#172b68"/>
        <path d="M295 174 C283 205 280 240 284 276 C288 306 277 329 254 345 C293 335 315 309 315 279 C315 246 309 213 318 181 C311 178 303 176 295 174Z" fill="#172b68"/>
      </g>
      ${compact ? '' : `<text x="210" y="366" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="42" letter-spacing="9" fill="#e96c70">Azaad</text><text x="210" y="396" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="18" letter-spacing="4" fill="#172b68">Psychotherapy</text>`}
    </svg>`;

  function applyBrandLogo() {
    const hero = document.querySelector('.hero-card-inner');
    if (hero && !hero.dataset.azaadLogoApplied) {
      hero.dataset.azaadLogoApplied = '1';
      hero.classList.add('hero-brand-mark');
      hero.innerHTML = logoSvg('azaad-logo-art hero-azaad-logo', false);
    }
    document.querySelectorAll('.logo').forEach(logo => {
      const mark = logo.querySelector('.azaad-brand-mark');
      if (mark) {
        mark.innerHTML = logoSvg('azaad-logo-art azaad-nav-logo', true);
        mark.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function injectStyles() {
    if (document.getElementById('azaad-public-experience-hardening-style')) return;
    const style = document.createElement('style');
    style.id = 'azaad-public-experience-hardening-style';
    style.textContent = `
      .logo{display:inline-flex;align-items:center;gap:9px}
      .azaad-brand-mark{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:linear-gradient(145deg,#fff7f7,#eaf8f8);color:#fff;overflow:hidden;box-shadow:0 5px 16px rgba(16,27,86,.12);flex:0 0 38px}
      .azaad-nav-logo{width:100%;height:100%;display:block}
      .hero-brand-mark{padding:18px!important;overflow:hidden;display:flex;align-items:center;justify-content:center}
      .hero-azaad-logo{display:block;width:min(100%,430px);height:auto;filter:drop-shadow(0 18px 30px rgba(23,43,104,.12))}
      .cards > .card{contain:layout paint;}
      #doctorsGrid,#servicesGrid,#clinicPostsGrid{content-visibility:auto;contain-intrinsic-size:420px;}
      #clinicPostsGrid .clinic-post-media img{object-fit:contain!important;object-position:center!important;height:auto!important;width:100%!important;background:#f7f4f8}
      #doctorsGrid .clinic-doctor-media img{object-fit:contain!important;object-position:center!important;height:auto!important;width:100%!important}
      .azaad-public-loading{min-height:120px;display:flex;align-items:center;justify-content:center;opacity:.72}
      .azaad-service-card p,.azaad-doctor-card p{line-height:1.75}
      .azaad-doctor-media{height:260px;border-radius:18px;overflow:hidden;background:#eef1f7;display:flex;align-items:center;justify-content:center}
      .azaad-doctor-media img{width:100%;height:100%;object-fit:contain!important;object-position:center;background:#eef1f7}
      @media(max-width:720px){.cards{gap:16px}.cards>.card{border-radius:16px}.azaad-brand-mark{width:32px;height:32px;flex-basis:32px}.hero-brand-mark{padding:10px!important}}
      @media(prefers-reduced-motion:reduce){.cards>*{transition:none!important}}
    `;
    document.head.appendChild(style);
    document.querySelectorAll('.logo').forEach(logo => {
      if (!logo.querySelector('.azaad-brand-mark')) {
        const mark = document.createElement('span');
        mark.className = 'azaad-brand-mark';
        mark.setAttribute('aria-hidden', 'true');
        logo.prepend(mark);
      }
    });
    applyBrandLogo();
  }

  function dedupeSelect(id, type) {
    const select = document.getElementById(id);
    if (!select) return;
    const seen = new Set();
    [...select.options].forEach(option => {
      if (!option.value) return;
      const key = `${type}:${String(option.value)}`;
      if (seen.has(key)) option.remove();
      else seen.add(key);
    });
  }

  function dedupeCards(gridId, type) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const seen = new Set();
    [...grid.children].forEach(card => {
      if (!(card instanceof HTMLElement)) return;
      const title = card.querySelector('h3,h4,strong')?.textContent || '';
      const image = card.querySelector('img')?.currentSrc || card.querySelector('img')?.src || '';
      const key = `${type}:${textKey(title)}:${safeUrl(image)}`;
      if (!textKey(title) && !image) return;
      if (seen.has(key)) card.remove();
      else seen.add(key);
    });
  }

  function dedupePublicData() {
    const clinicState = window.AZAAD?.state;
    if (clinicState) {
      if (Array.isArray(clinicState.doctors)) clinicState.doctors = unique(clinicState.doctors, 'doctor');
      if (Array.isArray(clinicState.services)) clinicState.services = unique(clinicState.services, 'service');
    }
    const postState = window.__AZAAD_CLINIC_POSTS_V9__;
    if (postState && Array.isArray(postState.posts)) postState.posts = unique(postState.posts, 'post');
    dedupeSelect('doctor', 'doctor');
    dedupeSelect('service', 'service');
    dedupeCards('doctorsGrid', 'doctor-card');
    dedupeCards('servicesGrid', 'service-card');
    dedupeCards('clinicPostsGrid', 'post-card');
    applyBrandLogo();
  }

  function renderServices(services) {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;
    const rows = unique(services, 'service');
    if (!rows.length) return;
    grid.innerHTML = rows.map(service => {
      const name = localText(service, 'name', 'name_en') || 'Azaad';
      const description = localText(service, 'description', 'description_en');
      const duration = Number(service.duration_minutes || 0);
      return `<article class="card azaad-service-card"><h3>${esc(name)}</h3>${description ? `<p>${esc(description)}</p>` : ''}${duration > 0 ? `<div class="muted">${esc(duration)} ${lang()==='en'?'minutes':'دقيقة'}</div>` : ''}</article>`;
    }).join('');
    dedupeCards('servicesGrid', 'service-card');
  }

  function renderDoctors(doctors) {
    const grid = document.getElementById('doctorsGrid');
    if (!grid) return;
    const rows = unique(doctors, 'doctor');
    if (!rows.length) return;
    grid.innerHTML = rows.map(doctor => {
      const name = localText(doctor, 'name', 'name_en') || 'Azaad';
      const title = localText(doctor, 'title', 'title_en');
      const bio = localText(doctor, 'bio', 'bio_en');
      const image = safeUrl(doctor.image_url);
      const media = image ? `<div class="azaad-doctor-media clinic-doctor-media"><img src="${esc(image)}" alt="${esc(name)}" loading="lazy" decoding="async"></div>` : '';
      return `<article class="card azaad-doctor-card">${media}<h3>${esc(name)}</h3>${title ? `<strong>${esc(title)}</strong>` : ''}${bio ? `<p>${esc(bio)}</p>` : ''}</article>`;
    }).join('');
    dedupeCards('doctorsGrid', 'doctor-card');
  }

  function publishCentralData(data) {
    window.AZAAD_PUBLIC_CLINIC_DATA = data;
    window.dispatchEvent(new CustomEvent('azaadPublicClinicDataReady', {detail:data}));
  }

  async function loadAndRenderClinicSurface() {
    if (window.__AZAAD_PUBLIC_CLINIC_SURFACE_PROMISE__) return window.__AZAAD_PUBLIC_CLINIC_SURFACE_PROMISE__;
    window.__AZAAD_PUBLIC_CLINIC_SURFACE_PROMISE__ = (async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(`${CLINIC_API}?api=data&_=${Date.now()}`, {cache:'no-store', signal:controller.signal, headers:{Accept:'application/json'}});
        clearTimeout(timer);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
        publishCentralData(data);
        renderServices(data.services || []);
        renderDoctors(data.doctors || []);
        if (Array.isArray(data.posts)) renderRecoveredPosts(data.posts);
        dedupePublicData();
        return data;
      } catch (error) {
        console.warn('Azaad central public surface:', error);
        return null;
      }
    })();
    return window.__AZAAD_PUBLIC_CLINIC_SURFACE_PROMISE__;
  }

  function renderRecoveredPosts(posts) {
    const clean = unique(posts, 'post');
    if (!clean.length || document.getElementById('clinicPostsGrid')?.children.length) return;
    const booking = document.getElementById('booking');
    const main = document.querySelector('main');
    if (!main) return;
    let section = document.getElementById('clinicPosts');
    if (!section) {
      section = document.createElement('section');
      section.id = 'clinicPosts';
      section.className = 'section section-light';
      section.innerHTML = '<div class="container"><div class="eyebrow">AZAAD</div><h2 data-i18n="postsTitle">Posts</h2><p class="section-intro" data-i18n="postsIntro"></p><div id="clinicPostsGrid" class="cards"></div></div>';
      if (booking?.parentNode) booking.parentNode.insertBefore(section, booking);
      else main.appendChild(section);
    }
    const grid = section.querySelector('#clinicPostsGrid');
    if (!grid) return;
    grid.innerHTML = clean.map(p => {
      const title = localText(p, 'title', 'title_en') || 'Azaad';
      const content = localText(p, 'content', 'content_en');
      const media = safeUrl(p?.media_url);
      const image = media && p?.media_type === 'image'
        ? `<div class="clinic-post-media"><img src="${esc(media)}" alt="${esc(title)}" loading="lazy" decoding="async"></div>` : '';
      return `<article class="card clinic-post-card">${image}<div><h3>${esc(title)}</h3>${content ? `<p>${esc(content)}</p>` : ''}</div></article>`;
    }).join('');
    section.style.display = '';
    dedupeCards('clinicPostsGrid', 'post-card');
  }

  function schedulePass() {
    injectStyles();
    loadAndRenderClinicSurface();
    dedupePublicData();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedulePass, {once:true});
  else schedulePass();
  [500, 1500, 3500].forEach(ms => setTimeout(schedulePass, ms));
  window.addEventListener('azaadLanguageChanged', () => {
    const data = window.AZAAD_PUBLIC_CLINIC_DATA;
    if (data) { renderServices(data.services || []); renderDoctors(data.doctors || []); renderRecoveredPosts(data.posts || []); }
  });
  const observer = new MutationObserver(() => dedupePublicData());
  observer.observe(document.documentElement, {childList:true, subtree:true});
})();