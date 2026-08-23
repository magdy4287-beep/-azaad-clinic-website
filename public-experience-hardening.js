(() => {
  const load = (src) => new Promise((resolve, reject) => { const s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject; document.head.appendChild(s); });
  load('/public-experience-hardening-core.js?v=2026.08.23.3').then(() => load('/public-media-transforms.js?v=2026.08.23.1')).catch(e => console.warn('Azaad public media loader:', e));
})();
