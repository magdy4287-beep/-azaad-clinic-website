(() => {
  'use strict';
  const ENGLISH = 'Your care starts here';
  function sync() {
    const dict = window.AZAAD_I18N?.dictionary;
    if (dict) dict['رعايتك تبدأ من هنا'] = ENGLISH;
    window.AZAAD_I18N?.apply?.();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync, { once:true });
  else sync();
  window.addEventListener('azaadLanguageChanged', sync);
})();