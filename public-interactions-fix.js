(() => {
  'use strict';

  const SITE = 'https://magdy4287-beep.github.io/-azaad-clinic-website/';
  const MAPS = 'https://maps.app.goo.gl/6kta6eBxN7TH88ATA?g_st=ic';
  const DEFAULT_WA = '201140526294';
  let initialized = false;
  let lastLanguage = '';

  function installPublicResponsiveStyles() {
    if (document.getElementById('azaad-public-responsive-v1')) return;
    const style = document.createElement('style');
    style.id = 'azaad-public-responsive-v1';
    style.textContent = `
      html, body { max-width: 100%; overflow-x: hidden; }
      .container, .booking-form, .card, .contact-grid a, .hero-content { min-width: 0; }
      .btn, .slot, .lang-btn, .menu-btn { touch-action: manipulation; }
      .btn, .slot, .menu-btn { min-height: 44px; }
      input, select, textarea { font-size: 16px; }
      .hero-buttons .btn, .location-actions .btn, .booking-submit { min-height: 48px; }

      @media (max-width: 768px) {
        .header { position: sticky; }
        .nav { min-height: 64px; }
        .nav-actions { min-width: 0; }
        .language-switch { flex: 0 0 auto; }
        .hero-grid { gap: 24px; }
        .hero-card { width: 100%; }
        .booking-form { width: 100%; }
        .slots { overflow-wrap: anywhere; }
        .slot { min-width: 72px; margin: 3px 2px; }
        .contact-grid a { padding: 16px; }
      }

      @media (max-width: 520px) {
        .container { width: calc(100% - 24px); }
        .section { padding: 48px 0; }
        .hero-grid { padding: 34px 0; }
        .hero-card { height: 220px; border-radius: 22px; }
        .hero-card-inner { width: 74%; border-radius: 18px; }
        .hero-buttons { width: 100%; }
        .hero-buttons .btn { width: 100%; }
        .booking-form { padding: 14px; border-radius: 16px; }
        .form-grid { gap: 12px; }
        .slots { padding: 7px; }
        .slot { width: calc(50% - 8px); min-width: 0; }
        .contact-grid { gap: 10px; }
        .location-actions { gap: 8px; }
        .footer { gap: 8px; }
      }

      @media (max-width: 380px) {
        .container { width: calc(100% - 18px); }
        .logo { font-size: 15px; }
        .hero h1 { font-size: 34px; }
        h2 { font-size: 28px; }
        .slot { width: 100%; }
        .booking-form { padding: 11px; }
        .lang-btn { min-height: 36px; }
      }
    `;
    document.head.appendChild(style);
  }

  const lang = () => {
    try {
      const saved = localStorage.getItem('azaadClinicLanguage');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    return String(document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  };
  const data = () => window.AZAAD_PUBLIC_CLINIC_DATA || {};
  const settings = () => data().settings || {};
  const setting = (...keys) => {
    for (const key of keys) {
      const value = settings()?.[key];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return '';
  };
  const wa = () => String(setting('whatsapp','whatsapp_number','whatsapp_phone','phone_whatsapp') || DEFAULT_WA).replace(/\D/g, '');

  function scrollToTarget(selector) {
    const target = document.querySelector(selector);
    if (!target) return false;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', selector);
    return true;
  }

  function openWhatsApp(message) {
    const number = wa();
    if (!number) return false;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.href = url;
    return true;
  }

  function shareLocationViaWhatsApp() {
    const english = lang() === 'en';
    const message = english
      ? `📍 Azaad Clinic for Mental Health\n\n${MAPS}\n\n🌐 ${SITE}`
      : `📍 عيادة أزاد للصحة النفسية\n\n${MAPS}\n\n🌐 ${SITE}`;
    openWhatsApp(message);
  }

  function shareLocationHref() {
    const english = lang() === 'en';
    const message = english
      ? `📍 Azaad Clinic for Mental Health\n\n${MAPS}\n\n🌐 ${SITE}`
      : `📍 عيادة أزاد للصحة النفسية\n\n${MAPS}\n\n🌐 ${SITE}`;
    return `https://wa.me/${wa()}?text=${encodeURIComponent(message)}`;
  }

  function announceLanguageChange() {
    const current = lang();
    document.documentElement.lang = current;
    document.documentElement.dir = current === 'en' ? 'ltr' : 'rtl';
    if (current !== lastLanguage) {
      lastLanguage = current;
      window.dispatchEvent(new CustomEvent('azaadLanguageChanged', { detail: { language: current } }));
    }
  }

  function bindLanguageSwitch() {
    document.querySelectorAll('[data-lang]').forEach(button => {
      if (button.dataset.azaadLanguageBound === 'true') return;
      button.dataset.azaadLanguageBound = 'true';
      button.addEventListener('click', () => {
        const requested = button.getAttribute('data-lang') === 'en' ? 'en' : 'ar';
        try { localStorage.setItem('azaadClinicLanguage', requested); } catch (_) {}
        setTimeout(announceLanguageChange, 0);
        setTimeout(() => window.AZAAD_I18N?.apply?.(), 20);
      });
    });
  }

  function bindAnchor(link, selector) {
    if (link.dataset.azaadInteractionBound === 'true') return;
    link.dataset.azaadInteractionBound = 'true';
    link.addEventListener('click', event => {
      if (scrollToTarget(selector)) event.preventDefault();
    });
  }

  function normalizeActions() {
    bindLanguageSwitch();
    announceLanguageChange();

    document.querySelectorAll('a[href="#booking"], a[href="./#booking"], a[href="index.html#booking"]').forEach(link => bindAnchor(link, '#booking'));
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href !== '#') bindAnchor(link, href);
    });

    const heroWa = document.getElementById('waHero');
    if (heroWa && heroWa.dataset.azaadInteractionBound !== 'true') {
      heroWa.dataset.azaadInteractionBound = 'true';
      heroWa.addEventListener('click', event => {
        event.preventDefault();
        openWhatsApp(lang() === 'en' ? 'Hello Azaad Clinic, I would like to ask about an appointment.' : 'مرحبًا عيادة أزاد، أود الاستفسار عن حجز موعد.');
      });
    }

    const maps = document.getElementById('mapsLink');
    if (maps) {
      maps.href = MAPS;
      maps.target = '_blank';
      maps.rel = 'noopener noreferrer';
    }

    const share = document.getElementById('shareLocation');
    if (share) {
      share.href = shareLocationHref();
      share.target = '_blank';
      share.rel = 'noopener noreferrer';
      share.setAttribute('role', 'button');
      share.removeAttribute('type');
      if (share.dataset.azaadInteractionBound !== 'true') {
        share.dataset.azaadInteractionBound = 'true';
        share.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          openWhatsApp(lang() === 'en' ? `📍 Azaad Clinic for Mental Health\n\n${MAPS}\n\n🌐 ${SITE}` : `📍 عيادة أزاد للصحة النفسية\n\n${MAPS}\n\n🌐 ${SITE}`);
        }, true);
      }
    }

    const phone = document.getElementById('phoneLink');
    const phoneValue = setting('phone','phone_number','clinic_phone','contact_phone');
    if (phone && phoneValue) phone.href = `tel:${phoneValue.replace(/[^\d+]/g, '')}`;

    const email = document.getElementById('emailLink');
    const emailValue = setting('email','clinic_email','contact_email');
    if (email && emailValue) email.href = `mailto:${emailValue}`;

    const waLink = document.getElementById('waLink');
    if (waLink) {
      waLink.href = `https://wa.me/${wa()}`;
      waLink.target = '_blank';
      waLink.rel = 'noopener noreferrer';
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    installPublicResponsiveStyles();
    normalizeActions();
    const observer = new MutationObserver(() => normalizeActions());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('hashchange', () => setTimeout(normalizeActions, 50));
    window.addEventListener('storage', event => { if (event.key === 'azaadClinicLanguage') setTimeout(normalizeActions, 20); });
    window.addEventListener('azaadLanguageChanged', () => setTimeout(normalizeActions, 20));
    setInterval(normalizeActions, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
