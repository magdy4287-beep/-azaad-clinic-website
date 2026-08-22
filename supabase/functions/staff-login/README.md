# staff-login

Canonical Edge Function source for the production admin authentication flow. The deployed function must remain synchronized with this directory.

## Production runtime synchronization

The production `staff-login` Edge Function was found running a stale proxy implementation while the repository contained the canonical direct-auth implementation. The runtime was synchronized to the repository source as Edge Function version 48 on 2026-08-22.

Required contract:

- `verify_jwt=false` because this endpoint performs its own credential authentication.
- Browser sends credentials only to `staff-login` over HTTPS.
- The function resolves the staff record server-side and authenticates the corresponding Supabase Auth user.
- The function returns the authenticated session and the authorized staff record.
- No browser-side direct `clinic_staff` authorization bypass is permitted.
- No service-role or secret key may be exposed to the browser.

Any future function deployment must be verified against this source and the Production Browser E2E before release.