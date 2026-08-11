(() => {
‘use strict’;

/*

* Azaad Clinic
* booking-fix.js
* IMPORTANT:
* The main booking system is handled by app.js.
* This file intentionally does NOT:
* ●	attach another submit handler
* ●	load clinic data
* ●	load appointment slots
* ●	create bookings
* It exists as a compatibility guard so older
* index.html deployments that still load
* booking-fix.js do not create duplicate
* booking requests or duplicate event listeners.
    */

window.AzaadClinicBookingFix = {
version: ‘4.0.0’,
enabled: false,
handledBy: ‘app.js’
};

})();
