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

  function injectStyles() {
    if (document.getElementById('azaad-public-experience-hardening-style')) return;
    const style = document.createElement('style');
    style.id = 'azaad-public-experience-hardening-style';
    style.textContent = `
      .logo{display:inline-flex;align-items:center;gap:9px}
      .azaad-brand-mark{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:10px;background:linear-gradient(145deg,#101b56,#b88b3a);color:#fff;font-size:14px;font-weight:900;box-shadow:0 5px 16px rgba(16,27,86,.16);flex:0 0 30px}
      .cards > .card{contain:layout paint;}
      #doctorsGrid,#servicesGrid,#clinicPostsGrid{content-visibility:auto;contain-intrinsic-size:420px;}
      #clinicPostsGrid .clinic-post-media img{object-fit:contain!important;object-position:center!important;height:auto!important;width:100%!important;background:#f7f4f8}
      #doctorsGrid .clinic-doctor-media img{object-fit:contain!important;object-position:center!important;height:auto!important;width:100%!important}
      .azaad-public-loading{min-height:120px;display:flex;align-items:center;justify-content:center;opacity:.72}
      .azaad-service-card p,.azaad-doctor-card p{line-height:1.75}
      .azaad-doctor-media{height:260px;border-radius:18px;overflow:hidden;background:#eef1f7;display:flex;align-items:center;justify-content:center}
      .azaad-doctor-media img{width:100%;height:100%;object-fit:contain!important;object-position:center;background:#eef1f7}
      @media(max-width:720px){.cards{gap:16px}.cards>.card{border-radius:16px}.azaad-brand-mark{width:28px;height:28px;flex-basis:28px}}
      @media(prefers-reduced-motion:reduce){.cards>*{transition:none!important}}
    `;
    document.head.appendChild(style);
    document.querySelectorAll('.logo').forEach(logo => {
      if (!logo.querySelector('.azaad-brand-mark')) {
        const mark = document.createElement('span');
        mark.className = 'azaad-brand-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = '✦';
        logo.prepend(mark);
      }
    });
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
