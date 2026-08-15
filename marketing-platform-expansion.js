/* AZAAD CLINIC — Marketing Platform Expansion
 * Adds TikTok + LinkedIn to the existing free-first Marketing Workspace V2.
 * No paid API, token, or external publishing dependency is introduced.
 */
(() => {
  'use strict';
  const platforms = [
    ['tiktok', '🎵 TikTok'],
    ['linkedin', '💼 LinkedIn'],
  ];
  const enhance = () => {
    const select = document.getElementById('mktPlatform');
    if (!select) return;
    for (const [value, label] of platforms) {
      if (!select.querySelector(`option[value="${value}"]`)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      }
    }
  };
  const observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  enhance();
  setTimeout(() => observer.disconnect(), 30000);
})();
