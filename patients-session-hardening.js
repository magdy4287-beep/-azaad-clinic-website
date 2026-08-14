/* Azaad Clinic — Patient Center session hardening
 * Prevents the Patient Center from persisting or recovering access tokens
 * through the legacy azaad_admin_token sessionStorage key.
 */
(() => {
  'use strict';
  try { sessionStorage.removeItem('azaad_admin_token'); } catch (_) {}
})();
