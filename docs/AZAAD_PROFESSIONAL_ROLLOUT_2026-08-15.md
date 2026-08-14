# Azaad Clinic — Professional Rollout Roadmap

## Source of truth
This roadmap extends the existing Azaad master execution plan. It does not replace verified production contracts.

## Global rules
- Free-first: no required paid SaaS, paid translation API, or paid AI API.
- Existing Supabase tables/functions are reused when verified.
- Patient MRN remains canonical and immutable.
- Clinical and financial data are never sent to external AI by default.
- Every module must pass UI → authorization → backend → validation → audit/security → i18n → regression → deployed verification.
- Performance is a product requirement: lazy media, bounded queries, pagination, minimal DOM churn, and no blocking third-party scripts.

## Phase A — Public experience
- Central Arabic/English translation with zero Arabic chrome in English mode.
- Booking navigation and primary actions.
- WhatsApp, Google Maps, website sharing.
- Patient Center action reliability.
- Mobile-first browser regression.

## Phase B — Patient 360 / clinical workflow
- Search by friendly patient number, canonical MRN, name, phone, booking number.
- Date-driven booking calendar: past, today, future, arbitrary date.
- Patient profile: contact data, upcoming visits, invoices, balances, warnings, notes.
- Clinical timeline and longitudinal progress visualization.
- Doctor follow-up scheduling and missed-follow-up alerts.
- Role-scoped administration/doctor visibility.
- AI only for non-diagnostic workflow assistance and trend summaries.

## Phase C — Clinic operations
- Doctors: profile, photo, specialty, availability, archive/reactivate.
- Services: full catalog, pricing, descriptions, archive/reactivate.
- Doctor schedules: active-doctor selectors, weekly hours, breaks, exceptions.
- Holidays/closures: all-clinic or selected doctors.
- General hours: weekly timetable and breaks.
- Staff/HR: active staff, compensation rules, documents, attendance/workload, performance, employee-of-month/year.
- Administration account and workflow compliance.
- Clinic settings and operational controls.

## Phase D — Revenue Cycle Management
- Invoice search by invoice number, patient number/MRN, name, phone, date.
- Invoice detail, items, payment state, outstanding balance, history.
- Daily/monthly/yearly RCM summaries.
- Doctor fee and clinic share rules.
- Collections, outstanding AR, payment reconciliation, daily closing.
- AI for anomaly detection and operational suggestions only.

## Phase E — Finance & purchasing
- Purchases with item, quantity, unit price, supplier, total, date.
- Expenses, revenue, net revenue, cash difference.
- Daily/monthly/yearly financial reporting.
- Budget/variance and approval workflow.
- Audit trail for financial changes.

## Phase F — Marketing Studio V2
- Instagram/Facebook-style composer.
- Large visual workspace with image/video preview.
- Direct image/video upload to existing free Supabase `clinic-media` bucket.
- 50 MB media limit with accepted web image/video formats.
- Draft → scheduled → published → archived lifecycle.
- Platform targeting: Instagram, Facebook, both, website.
- Search/filter posts and campaign status.
- Edit and safe archive rather than destructive deletion.
- Media audit records through `clinic_media_uploads`.
- Lazy-loaded media and bounded 200-post query for fast admin UX.
- AI caption/hashtag suggestions remain optional and non-blocking.
- No paid Meta/Instagram API dependency; external social publishing APIs can be added later only as optional adapters.

## Phase G — Executive analytics & AI
- Operations dashboard: bookings, completion, no-show, collections, AR, expenses, net.
- Doctor/staff performance.
- Daily/monthly/yearly trends.
- AI recommendations from aggregate operational data.
- No diagnosis or patient-identifying data in external AI prompts.

## Phase H — Security & reliability
- Admin session single-flight restore.
- Role/permission enforcement server-side.
- Audit/security event monitoring.
- Storage and upload validation.
- Safe archival instead of destructive deletion where historical records matter.
- CI structural gates + browser regression.
- Production smoke after deployment.

## Definition of done
A feature is not considered complete because a button exists. It must work end-to-end, respect authorization, preserve existing data contracts, support Arabic/English, pass regression tests, and be verified in the deployed environment.
