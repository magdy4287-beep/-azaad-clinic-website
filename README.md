# Azaad Clinic — Production Frontend

Production frontend for Azaad Clinic.

## Deployment

- Primary production deployment: Vercel
- Repository branch: `main`
- Static frontend: this repository
- Backend: Supabase Edge Functions
- GitHub Actions: CI, security, browser, smoke and production gates
- Deployment protection may apply to preview URLs; it must not be disabled merely to make a smoke test pass.

The production provider is Vercel. A release is not considered production-proven merely because a GitHub commit or build succeeds; the exact release commit must have a READY Vercel deployment and the runtime must be verified through an appropriate protected/authenticated path when deployment protection is enabled.

## Routes

- Patient site: `/`
- Admin control center: `/admin/`
- Booking status: `/booking-status.html`
- Clinical assessment tools: `/clinical-assessment.html`
- Clinical assessment history: `/clinical-assessment-history.html`
- Clinical question bank: `/clinical-question-bank.html`

## Architecture

- Frontend: static HTML/CSS/JavaScript hosted by Vercel
- Authentication: Supabase Auth
- Database: Supabase Postgres with RLS
- Backend APIs: secured Supabase Edge Functions
- Clinical tools: permission-gated and scoped to authenticated clinical staff
- AI features: assistive decision-support only; final clinical decisions remain with qualified clinicians

## Security

- The frontend must never contain a Supabase Service Role key.
- Administrative and clinical operations are protected by Supabase Auth, RLS, permissions, and secured Edge Functions.
- Sensitive clinic settings are not publicly readable from the `clinic_settings` table.
- Clinical assessment access requires authenticated staff permissions and appropriate patient/visit scope.
- Legacy browser session-token fallbacks should not be used for clinical authorization.
- Financial refunds require Doctor approval followed by Management/Owner approval before Finance processing; AI cannot approve refunds.

## API contract

Core Edge Function request/response contracts are maintained in `docs/AZAAD_API_CONTRACT.md` and must remain aligned with the implementation.

## Production evidence policy

Azaad Clinic uses evidence-based production gates. A feature is not considered complete because code exists or a commit was created. Relevant source, backend security, browser/E2E, production deployment, API and runtime evidence must be fresh before the corresponding gate is closed.
