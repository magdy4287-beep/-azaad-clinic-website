# Azaad Clinic — Current Sprint — 2026-08-14

## Goal
Stabilize the production browser experience before the next screen-by-screen acceptance pass.

## Completed in this sprint
- Fixed the admin reload/session race caused by the classic patient-session bridge running before the deferred admin module exposed `window.AZAAD`.
- Added a retry-safe `AZAAD_AUTH_READY` promise for patient-center modules.
- Added a startup auth guard so a transient staff-profile restore failure cannot immediately sign the user out during page bootstrap.
- Added centralized free-first language infrastructure and a persistent Arabic/English switch for `admin.html`.
- Reused the existing `admin-english-hardening.js` translation map instead of introducing a paid translation dependency.
- Kept canonical MRN values unchanged; display/search normalization remains a UI-only contract.
- Hardened public booking/navigation/WhatsApp/Google Maps/share interactions.
- Added regression tests for public actions and English UI mode.

## Free-first rule
Core operation must remain functional without paid AI, paid translation, paid analytics, or paid automation services. External AI is optional and must never be a core dependency.

## Next acceptance order
1. Verify admin login + reload + patient center buttons.
2. Verify public Arabic/English switch and all primary links/buttons.
3. Verify Patient/Appointment Center date search and Patient File actions.
4. Continue the approved master execution order: doctors → services → schedules → closures/hours → RCM → finance/analytics → HR → settings/workflow → marketing → security → optional smart insights.

## Safety constraints
- Do not change the existing owner/admin account contract.
- Do not rewrite canonical MRNs.
- Do not place service-role or secret keys in frontend code.
- Clinical AI must remain advisory only and never replace clinician judgment.
