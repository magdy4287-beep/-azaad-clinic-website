(() => {
  'use strict';

  /*
   * =========================================================
   * AZAAD CLINIC
   * booking-fix.js
   * =========================================================
   *
   * Compatibility guard for the public booking system.
   *
   * IMPORTANT:
   * - app.js remains the ONLY booking submit/slot handler.
   * - This file must NOT create duplicate booking requests.
   * - It also bootstraps public-ui.js because older index.html
   *   deployments may not include public-ui.js directly.
   * =========================================================
   */

  window.AzaadClinicBookingFix = {
    version: '4.1.0',
    enabled: false,
    handledBy: 'app.js',
    publicUiBootstrapped: false
  };

  function loadPublicUI() {
    if (window.AzaadClinicPublicUILoaded) {
      window.AzaadClinicBookingFix.publicUiBootstrapped = true;
      return;
    }

    const existing = document.querySelector(
      'script[data-azaad-public-ui="true"]'
    );

    if (existing) {
      return;
    }

    const script = document.createElement('script');

    script.src = 'public-ui.js?v=1';

    script.async = false;

    script.dataset.azaadPublicUi = 'true';

    script.onload = () => {
      window.AzaadClinicPublicUILoaded = true;

      window.AzaadClinicBookingFix.publicUiBootstrapped = true;
    };

    script.onerror = (error) => {
      console.error(
        'Azaad Clinic public UI failed to load:',
        error
      );
    };

    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      loadPublicUI,
      {
        once: true
      }
    );

  } else {

    loadPublicUI();

  }

})();
