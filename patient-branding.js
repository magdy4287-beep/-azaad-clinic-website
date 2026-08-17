(() => {
  'use strict';
  const FORM_ID = 'bookingForm';
  const BRAND_ID = 'azaadOfficialPatientBrand';
  const LANG_KEY = 'azaadClinicLanguage';
  const t = (ar, en) => {
    try { return localStorage.getItem(LANG_KEY) === 'en' ? en : ar; } catch (_) { return ar; }
  };
  function render() {
    const form = document.getElementById(FORM_ID);
    if (!form || document.getElementById(BRAND_ID)) return;
    const target = form.querySelector('.booking-header') || form.querySelector('.form-grid')?.parentElement || form;
    if (!target) return;
    const card = document.createElement('div');
    card.id = BRAND_ID;
    card.setAttribute('role', 'img');
    card.setAttribute('aria-label', 'Azaad Psychotherapy Clinic');
    card.innerHTML = `<img src="/assets/azaad-profile-logo.svg" alt="Azaad Psychotherapy" width="72" height="72" decoding="async"><div><strong>${t('عيادة أزاد للعلاج النفسي','Azaad Psychotherapy Clinic')}</strong><span>${t('رعاية نفسية آمنة وخاصة','Safe, private mental healthcare')}</span></div>`;
    target.prepend(card);
  }
  function style() {
    if (document.getElementById('azaadOfficialPatientBrandStyles')) return;
    const s = document.createElement('style');
    s.id = 'azaadOfficialPatientBrandStyles';
    s.textContent = `#azaadOfficialPatientBrand{display:flex;align-items:center;gap:14px;width:fit-content;max-width:100%;margin:0 0 18px;padding:10px 14px;border:1px solid #e4e8f2;border-radius:16px;background:linear-gradient(135deg,#fff5ee,#f7e9f6,#e8f5f3);box-shadow:0 5px 18px rgba(16,27,86,.08)}#azaadOfficialPatientBrand img{width:72px;height:72px;border-radius:50%;display:block;flex:0 0 72px}#azaadOfficialPatientBrand strong{display:block;color:#101b56;font-size:17px}#azaadOfficialPatientBrand span{display:block;color:#68738b;font-size:13px;margin-top:3px}@media(max-width:700px){#azaadOfficialPatientBrand{width:100%;padding:9px 10px}#azaadOfficialPatientBrand img{width:58px;height:58px;flex-basis:58px}#azaadOfficialPatientBrand strong{font-size:15px}}`;
    document.head.appendChild(s);
  }
  function init() { style(); render(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
  new MutationObserver(render).observe(document.documentElement, { childList: true, subtree: true });
})();
