/* AZAAD CLINIC — CENTRAL I18N STABILITY
 * Central i18n owns language state and language controls.
 * This compatibility layer only prevents legacy 1-second polling loops
 * from surviving boot; it must never bind, clone, or dispatch language controls.
 */
(() => {
  'use strict';
  if (window.__AZAAD_I18N_STABILITY__) return;
  window.__AZAAD_I18N_STABILITY__ = true;

  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const trackedIntervals = new Set();
  let tracking = true;

  window.setInterval = function (handler, timeout, ...args) {
    const id = nativeSetInterval(handler, timeout, ...args);
    if (tracking && Number(timeout) >= 900 && Number(timeout) <= 1100) trackedIntervals.add(id);
    return id;
  };

  function stabilize() {
    tracking = false;
    trackedIntervals.forEach(nativeClearInterval);
    trackedIntervals.clear();
    window.setInterval = nativeSetInterval;
  }

  function waitForCentral(attempt = 0) {
    if (window.AZAAD_I18N || attempt >= 120) {
      stabilize();
      return;
    }
    window.setTimeout(() => waitForCentral(attempt + 1), 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForCentral(), { once: true });
  } else {
    waitForCentral();
  }
})();
