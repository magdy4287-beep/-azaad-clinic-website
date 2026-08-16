# AZAAD CLINIC — Implementation Map

## Core rule
Central I18N is the only presentation-language authority. Language changes must never mutate clinical, appointment, billing, or patient data.

## Front Desk workflow
Patient file → Appointment → Check-in → Invoice → Payment → Close invoice → Ready for doctor → Doctor queue → Visit completed → Patient left.

## Appointment states
PENDING → CONFIRMED → ARRIVED_EARLY / LATE → CHECKED_IN → IN_CLINIC → WITH_DOCTOR → VISIT_COMPLETED → LEFT_CLINIC.
NO_SHOW may be recovered when the patient actually arrives. CANCELLED is not a normal check-in path.

## Locale stability contract
- English page: all UI labels, statuses, dates, times, specialties, departments, services, billing labels, notifications, errors, placeholders, and AI-facing presentation text must render in English.
- Arabic page: the same surfaces render in Arabic.
- Personal names are not machine-translated. Use an approved localized field when available; otherwise preserve the source name.
- Canonical database values remain language-neutral.
- Date/time formatting uses the active locale and clinic timezone.
- Language switching is presentation-only and must not change database state.
- Translation failures must degrade safely without breaking the page.
- Translation initialization must be idempotent; no duplicate listeners or recursive language-change loops.

## Release gates
1. Central I18N contract
2. Translation stability / no mixed-language regression
3. Front Desk check-in and early/late/no-show recovery
4. Invoice/payment/close workflow
5. Doctor queue and doctor-scoped authorization
6. Doctor A/B isolation E2E
7. Admin + Patient + Front Desk + Doctor locale E2E
8. Production smoke and integration gates

## Free-only constraint
No paid deployment or API dependency is required for the architecture. Existing free-capable GitHub/Supabase paths remain the baseline; Vercel is not a required single point of failure.
