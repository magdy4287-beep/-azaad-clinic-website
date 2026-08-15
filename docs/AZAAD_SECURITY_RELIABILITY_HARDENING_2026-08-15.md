# AZAAD SECURITY & RELIABILITY HARDENING

## Objective

Protect patient, clinical, financial and staff data while keeping the clinic usable during AI/provider/network failures.

## Layers

1. Authentication and session lifecycle.
2. Role-based authorization.
3. Supabase RLS.
4. Edge Function authorization.
5. Input validation and output encoding.
6. Rate limiting/abuse controls where available.
7. Audit logging.
8. Error monitoring and structured logs.
9. Dependency/workflow security.
10. Backup/recovery and restore verification.
11. Browser regression tests.
12. AI-off fallback.

## Admin reload/session issue

Admin reload must restore a valid authenticated session when one exists. It must never silently destroy a valid session. Expired/revoked sessions must redirect to login with a clear reason. Logout, forced logout and session-expiry messages must be distinguishable.

## Patient dashboard interaction hardening

Every primary patient-facing action must have a verified event handler and a graceful fallback:

- Book session.
- WhatsApp contact.
- Main menu navigation.
- Google Maps/location.
- Share website via WhatsApp.
- Language switching.

Use progressive enhancement so a JavaScript failure does not turn important links into dead buttons.

## Centralized bilingual UI

All dynamic UI strings must pass through one translation service/registry. English mode must not leave Arabic fragments. Missing translation keys must be detectable in development/CI.

## Security boundaries

- No Supabase service-role key in frontend.
- No secrets committed to repository.
- Sensitive operations through authenticated server-side functions.
- Minimum-necessary patient data.
- Audit privileged changes.
- No AI-only security blocking.

## Reliability

- Network errors show actionable messages.
- AI timeout does not block core workflow.
- Duplicate event handlers are prevented.
- Loading states prevent double-submit.
- Critical saves confirm server persistence.
- Unsaved clinical data is clearly labeled.

## CI security gates

Check:

- secret scanning.
- dangerous frontend keys.
- service-role strings.
- obvious credential patterns.
- workflow permissions.
- unpinned third-party actions where policy requires pinning.
- JavaScript syntax.
- critical navigation/event hooks.
- bilingual key coverage.
- AI-off fallback.

## Recovery

Document:

- backup frequency.
- retention.
- restore procedure.
- incident ownership.
- recovery verification.

No claim of "unhackable" or "zero downtime" should be made. The goal is layered defense, rapid detection, recovery and graceful degradation.
