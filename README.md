# Azaad Clinic — Production Frontend

Production frontend for Azaad Clinic.

## Deployment

- Current certified production deployment: Vercel
- Production project: `azaad-clinic-website`
- Production URL: `https://azaad-clinic-website.vercel.app/`
- Repository branch: `main`
- Static frontend: this repository
- Backend: Supabase Edge Functions
- GitHub Pages remains a portable/static-hosting target; it is not the current production certification target.
- Production build authority: `qa/vercel-build.py`
- Browser certification authority: `.github/workflows/azaad-browser-e2e.yml`

Production certification is SHA-bound: the deployed Admin artifact exposes `meta[name="azaad-build-sha"]`, and the canonical browser E2E verifies that value against the commit under certification.

## Routes

- Patient site: `/`
- Admin control center: `/admin.html`
- Booking status: `/booking-status.html`
- Clinical assessment tools: `/clinical-assessment.html`
- Clinical assessment history: `/clinical-assessment-history.html`
- Clinical question bank: `/clinical-question-bank.html`

There is intentionally no separate `/patient.html` route in the canonical frontend. The patient-facing experience is the root public site (`/`); patient 360 is an authenticated Admin clinical domain.

## Architecture

- Frontend: static HTML/CSS/JavaScript hosted by the certified production host
- Authentication: Supabase Auth
- Database: Supabase Postgres with RLS
- Backend APIs: secured Supabase Edge Functions
- Clinical tools: permission-gated and scoped to authenticated clinical staff
- AI features: assistive decision-support only; final clinical decisions remain with qualified clinicians
- Admin runtime: one core + one lazy registry + one panel loader
- Browser certification: one canonical production browser E2E workflow

## Security

- The frontend must never contain a Supabase Service Role key.
- Administrative and clinical operations are protected by Supabase Auth, RLS, permissions, and secured Edge Functions.
- Sensitive clinic settings are not publicly readable from the `clinic_settings` table.
- Clinical assessment access requires authenticated staff permissions and appropriate patient/visit scope.
- Legacy browser session-token fallbacks should not be used for clinical authorization.

## Data integrity

E2E fixtures may coexist with operational records in the database, but operational reporting excludes records explicitly marked with the `E2E-` booking-code contract. Fixtures are never deleted merely to make production metrics look clean.

## Free-first deployment policy

Azaad Clinic is designed to minimize dependence on paid infrastructure. The current production target uses the available Vercel free-tier deployment and Supabase free-tier-compatible architecture. Hosting remains portable so the application can be moved without rebuilding the clinical/business logic.
