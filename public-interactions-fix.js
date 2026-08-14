(() => {
  'use strict';

  const SITE = 'https://magdy4287-beep.github.io/-azaad-clinic-website/';
  const MAPS = 'https://maps.app.goo.gl/6kta6eBxN7TH88ATA?g_st=ic';
  const DEFAULT_WA = '201140526294';
  let initialized = false;

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
  const address = () => setting('address','clinic_address','location','clinic_location') || 'دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض';

  function scrollToTarget(selector) {
    const target = document.querySelector(selector);
    if (!target) return false;
    target.scrollIntoView({ behavior:'smooth', block:'start' });
    history.replaceState(null, '', selector);
    return true;
  }

  function openWhatsApp(message) {
    const url = `https://wa.me/${wa()}?text=${encodeURIComponent(message)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.href = url;
  }

  function websiteShare() {
    const english = lang() === 'en';
    const text = english
      ? `🌐 Share Azaad Clinic website\n\n🏥 Azaad Clinic for Mental Health\n\n${SITE}`
      : `🌐 مشاركة موقع عيادة أزاد\n\n🏥 عيادة أزاد للصحة النفسية\n\n${SITE}`;

    if (navigator.share) {
      navigator.share({ title: english ? 'Azaad Clinic' : 'عيادة أزاد', text, url: SITE }).catch(() => {});
      return;
    }

    openWhatsApp(text);
  }

  function normalizeActions() {
    const bookingLinks = document.querySelectorAll('a[href="#booking"], a[href="./#booking"], a[href="index.html#booking"]');
    bookingLinks.forEach(link => {
      if (link.dataset.azaadInteractionBound === 'true') return;
      link.dataset.azaadInteractionBound = 'true';
      link.addEventListener('click', event => {
        event.preventDefault();
        scrollToTarget('#booking');
        document.getElementById('doctor')?.focus({ preventScroll:true });
      });
    });

    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    navLinks.forEach(link => {
      if (link.dataset.azaadInteractionBound === 'true') return;
      link.dataset.azaadInteractionBound = 'true';
      link.addEventListener('click', event => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        if (document.querySelector(href)) {
          event.preventDefault();
          scrollToTarget(href);
        }
      });
    });

    const heroWa = document.getElementById('waHero');
    if (heroWa && heroWa.dataset.azaadInteractionBound !== 'true') {
      heroWa.dataset.azaadInteractionBound = 'true';
      heroWa.addEventListener('click', event => {
        event.preventDefault();
        openWhatsApp(lang() === 'en'
          ? 'Hello Azaad Clinic, I would like to ask about an appointment.'
          : 'مرحبًا عيادة أزاد، أود الاستفسار عن حجز موعد.');
      });
    }

    const maps = document.getElementById('mapsLink');
    if (maps) {
      maps.href = MAPS;
      maps.target = '_blank';
      maps.rel = 'noopener noreferrer';
    }

    const share = document.getElementById('shareLocation');
    if (share && share.dataset.azaadInteractionBound !== 'true') {
      share.dataset.azaadInteractionBound = 'true';
      share.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        websiteShare();
      }, true);
    }

    const phone = document.getElementById('phoneLink');
    const phoneValue = setting('phone','phone_number','clinic_phone','contact_phone');
    if (phone && phoneValue) phone.href = `tel:${phoneValue.replace(/[^\d+]/g, '')}`;

    const email = document.getElementById('emailLink');
    const emailValue = setting('email','clinic_email','contact_email');
    if (email && emailValue) email.href = `mailto:${emailValue}`;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    normalizeActions();
    const observer = new MutationObserver(() => normalizeActions());
    observer.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('hashchange', () => setTimeout(normalizeActions, 50));
    window.addEventListener('azaadLanguageChanged', () => setTimeout(normalizeActions, 50));
    setInterval(normalizeActions, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
