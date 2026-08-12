(() => {
  'use strict';

  /*
   * =========================================================
   * AZAAD CLINIC
   * booking-fix.js
   * =========================================================
   *
   * IMPORTANT:
   *
   * The main booking system is handled by app.js.
   *
   * This file intentionally does NOT:
   *
   * ● attach another submit handler
   * ● load clinic data
   * ● load appointment slots
   * ● create bookings
   *
   * It exists only as a compatibility guard for older
   * index.html deployments that may still load this file.
   *
   * This prevents duplicate booking requests and
   * duplicate event listeners.
   *
   * =========================================================
   */

  window.AzaadClinicBookingFix = {
    version: '4.0.1',
    enabled: false,
    handledBy: 'app.js'
  };

})();
