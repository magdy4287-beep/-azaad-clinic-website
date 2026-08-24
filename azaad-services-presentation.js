(() => {
  'use strict';

  // Free-to-use Pexels photography selected for a polished, premium healthcare look.
  // The people are photogenic and professionally presented while the service data remains
  // owned by the central clinic-data flow.
  const serviceImages = [
    {
      src: 'https://images.pexels.com/photos/7176315/pexels-photo-7176315.jpeg?auto=compress&cs=tinysrgb&w=900',
      altAr: 'جلسة علاج نفسي بين معالج ومريضة في أجواء مريحة وإيجابية',
      altEn: 'Psychotherapy session between a therapist and patient in a warm positive setting'
    },
    {
      src: 'https://images.pexels.com/photos/7176300/pexels-photo-7176300.jpeg?auto=compress&cs=tinysrgb&w=900',
      altAr: 'جلسة علاج نفسي جماعي مع معالج ومجموعة من المرضى في أجواء داعمة',
      altEn: 'Group psychotherapy session with a therapist and several patients in a supportive setting'
    },
    {
      src: 'https://images.pexels.com/photos/7195091/pexels-photo-7195091.jpeg?auto=compress&cs=tinysrgb&w=900',
      altAr: 'جلسة علاج نفسي أونلاين بين طبيبة ومريض عبر مكالمة فيديو باستخدام الكمبيوتر',
      altEn: 'Online psychotherapy consultation between a doctor and patient through a laptop video call'
    },
    {
      src: 'https://images.pexels.com/photos/7579302/pexels-photo-7579302.jpeg?auto=compress&cs=tinysrgb&w=900',
      altAr: 'تقييم نفسي وحوار مهني بين المعالج والمريض في بيئة مريحة',
      altEn: 'Psychological assessment and professional discussion between therapist and patient in a comfortable setting'
    }
  ];

  const icons = [
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 39s-15-8.7-15-20.2C9 13.4 13 9 18.2 9c3 0 5.2 1.5 5.8 4.1C24.8 10.5 27 9 29.8 9 35 9 39 13.4 39 18.8 39 30.3 24 39 24 39Z" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M17 24h5l2.2-6 3.2 11 2.1-5H33" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="7" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M11 39c1.5-8 6-12 13-12s11.5 4 13 12" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M32 11l5 5m0-5-5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="11" width="34" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M17 40h14M24 35v5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M17 23h14M17 28h8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7a17 17 0 0 0-17 17c0 3.2.9 6.1 2.4 8.7L7 41l8.5-2.7A17 17 0 1 0 24 7Z" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M17 24h14M24 17v14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>'
  ];

  function currentLanguage() {
    const lang = String(document.documentElement.lang || '').toLowerCase();
    return lang === 'en' || lang.startsWith('en-') ? 'en' : 'ar';
  }

  function enhance() {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll(':scope > .card'));
    cards.forEach((card, index) => {
      if (card.querySelector('.azaad-service-visual')) return;

      const visual = document.createElement('div');
      visual.className = 'azaad-service-visual';

      const image = serviceImages[index % serviceImages.length];
      if (image) {
        const img = document.createElement('img');
        img.className = 'azaad-service-photo';
        img.src = image.src;
        img.alt = currentLanguage() === 'en' ? image.altEn : image.altAr;
        img.loading = index < 2 ? 'eager' : 'lazy';
        img.decoding = 'async';
        img.fetchPriority = index === 0 ? 'high' : 'auto';
        visual.appendChild(img);
      }

      const badge = document.createElement('span');
      badge.className = 'azaad-service-badge';
      badge.textContent = `0${index + 1}`;

      const icon = document.createElement('span');
      icon.className = 'azaad-service-icon';
      icon.innerHTML = icons[index % icons.length];

      visual.append(badge, icon);
      card.prepend(visual);
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  const grid = document.getElementById('servicesGrid');
  if (grid) {
    new MutationObserver(schedule).observe(grid, { childList: true, subtree: true });
  } else {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
})();
