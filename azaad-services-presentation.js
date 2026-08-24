(() => {
  'use strict';

  const icons = [
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 39s-15-8.7-15-20.2C9 13.4 13 9 18.2 9c3 0 5 1.5 5.8 4.1C24.8 10.5 27 9 29.8 9 35 9 39 13.4 39 18.8 39 30.3 24 39 24 39Z" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M17 24h5l2.2-6 3.2 11 2.1-5H33" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="7" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M11 39c1.5-8 6-12 13-12s11.5 4 13 12" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M32 11l5 5m0-5-5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7a16 16 0 0 0-9.4 28.9L13 41l6.5-3.2A16 16 0 1 0 24 7Z" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M18 20h12M18 26h8" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7 28 19l13 5-13 5-4 12-4-12-13-5 13-5 4-12Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><circle cx="36" cy="12" r="3" fill="currentColor"/></svg>'
  ];

  function enhance() {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll(':scope > .card'));
    cards.forEach((card, index) => {
      if (card.querySelector('.azaad-service-visual')) return;
      const visual = document.createElement('div');
      visual.className = 'azaad-service-visual';
      visual.setAttribute('aria-hidden', 'true');
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
