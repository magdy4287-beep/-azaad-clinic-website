# Azaad Clinic — Production Frontend

Production frontend for Azaad Clinic.

## Deployment

- Current certified production deployment: Vercel
- Production project: `azaad-clinic-website`
- Production URL: `https://azaad-clinic-website.vercel.app/`
- Repository branch: `main`
- Static frontend: this repository
- Backend APIs: Vercel serverless functions in `api/`
- Authentication: Appwrite, reached server-side through the Vercel backend
- Database: Neon PostgreSQL, reached server-side through the Vercel backend
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

## Canonical architecture

```text
Browser
  -> Vercel API boundary
      -> Appwrite authentication/session validation
      -> Neon PostgreSQL data access
      -> local/free-only business and AI rules where applicable
```

- Frontend: static HTML/CSS/JavaScript hosted by the certified production host
- Authentication: Appwrite
- Database: Neon PostgreSQL
- Backend APIs: Vercel serverless functions in `api/`
- Secrets: provider environment/secret stores only; never shipped to browser code
- Clinical tools: permission-gated and scoped to authenticated clinical staff
- AI features: assistive decision-support only; final clinical decisions remain with qualified clinicians
- Admin runtime: one core + one lazy registry + one panel loader
- Browser certification: one canonical production browser E2E workflow

### Supabase retirement boundary

Supabase is **not part of the AZAAD production runtime**. The project was moved away from Supabase because the previous runtime encountered quota/billing constraints and AZAAD's product requirement is a free-only operating model.

The `supabase/` directory and historical Supabase migrations/functions are retained only as legacy engineering history/rollback evidence. They must not be used as production APIs, authentication, database authority, or a required CI runtime dependency. New production code must use the canonical Vercel → Appwrite/Neon boundary.

## Security

- The frontend must never contain an Appwrite API key, Neon database URL/credential, database secret, or service-role credential.
- Administrative and clinical operations are authorized server-side by Appwrite identity mapped to active `clinic_staff` records in Neon.
- Sensitive database reads/writes are performed by the Vercel backend, not directly by browser code.
- Session cookies are bounded and protected; server routes fail closed when identity or database configuration is unavailable.
- Clinical assessment access requires authenticated staff permissions and appropriate patient/visit scope.
- Legacy browser session-token and Supabase-auth fallbacks are not part of the canonical production authorization path.

## Data integrity

E2E fixtures may coexist with operational records in the database, but operational reporting excludes records explicitly marked with the `E2E-` booking-code contract. Fixtures are never deleted merely to make production metrics look clean.

## Free-only deployment policy

AZAAD is a **free-only architecture**: no paid AI API, paid SaaS subscription, or quota upgrade is a required production dependency. The canonical runtime is Vercel + Appwrite + Neon using the available free-compatible tiers/limits. Provider limits must be monitored and must not be worked around by silently introducing a paid dependency.
