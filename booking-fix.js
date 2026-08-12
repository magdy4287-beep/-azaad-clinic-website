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
   * - public-ui.js is normally loaded directly by index.html.
   * - This file only bootstraps public-ui.js when it is genuinely
   *   missing, and never loads it twice.
   * =========================================================
   */

  const STATE_KEY = '__AZAAD_BOOKING_FIX_INITIALIZED__';

  window.AzaadClinicBookingFix =
    window.AzaadClinicBookingFix || {
      version: '4.2.0',
      enabled: false,
      handledBy: 'app.js',
      publicUiBootstrapped: false
    };

  const state = window.AzaadClinicBookingFix;

  function publicUiAlreadyPresent() {
    return Boolean(
      window.AzaadClinicPublicUILoaded ||
      window.AzaadClinicPublicUI ||
      document.querySelector(
        'script[src*="public-ui.js"]'
      ) ||
      document.querySelector(
        'script[data-azaad-public-ui="true"]'
      )
    );
  }

  function markPublicUIReady() {
    state.publicUiBootstrapped = true;

    try {
      window.AzaadClinicPublicUILoaded = true;
    } catch (_) {
      // Ignore read-only/global assignment problems.
    }
  }

  function loadPublicUIIfNeeded() {
    /*
     * index.html already loads public-ui.js.
     * Never inject another copy when it is present.
     */
    if (publicUiAlreadyPresent()) {
      markPublicUIReady();
      return;
    }

    /*
     * Prevent this compatibility loader itself from running
     * more than once.
     */
    if (
      document.querySelector(
        'script[data-azaad-public-ui-loader="true"]'
      )
    ) {
      return;
    }

    const script =
      document.createElement('script');

    script.src =
      'public-ui.js?v=1';

    script.async = false;

    script.dataset.azaadPublicUi = 'true';

    script.dataset.azaadPublicUiLoader =
      'true';

    script.onload = () => {
      markPublicUIReady();
    };

    script.onerror = (error) => {
      console.error(
        'Azaad Clinic public UI failed to load:',
        error
      );
    };

    document.head.appendChild(script);
  }

  function initialize() {
    /*
     * Hard guard against duplicate initialization
     * if this script is accidentally included more than once.
     */
    if (window[STATE_KEY]) {
      return;
    }

    window[STATE_KEY] = true;

    /*
     * This compatibility file does NOT:
     *
     * - submit bookings
     * - fetch slots
     * - attach booking form handlers
     * - call Supabase
     * - modify booking payloads
     *
     * app.js remains the sole booking controller.
     */
    state.enabled = false;
    state.handledBy = 'app.js';

    loadPublicUIIfNeeded();
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }

})();
