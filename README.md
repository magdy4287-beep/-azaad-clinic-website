# Azaad Clinic — Production Frontend

Production frontend for Azaad Clinic.

## Deployment

- Primary production deployment: GitHub Pages
- Repository branch: `main`
- Static frontend: this repository
- Backend: Supabase Edge Functions
- Vercel: optional development/preview environment; production does not depend on Vercel deployments
- Deployment workflow: `.github/workflows/jekyll-docker.yml`

The GitHub Pages workflow runs on pushes to `main`, builds the static site artifact, and deploys it with the GitHub Pages deployment actions. The workflow uses concurrency protection so a newer deployment can cancel an older in-progress deployment.

## Routes

- Patient site: `/`
- Admin control center: `/admin/`
- Booking status: `/booking-status.html`
- Clinical assessment tools: `/clinical-assessment.html`
- Clinical assessment history: `/clinical-assessment-history.html`
- Clinical question bank: `/clinical-question-bank.html`

## Architecture

- Frontend: static HTML/CSS/JavaScript hosted by GitHub Pages
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

## Free-first deployment policy

Azaad Clinic is designed to minimize dependence on paid infrastructure. GitHub Pages is the primary static production host and Supabase is the backend platform. No claim is made that any third-party free tier is guaranteed forever; the application should remain portable so hosting can be changed without rebuilding the clinical/business logic.
