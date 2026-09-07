# AZAAD Engineering Architecture

## 1. Canonical ownership

The repository follows one-owner-per-responsibility. A feature may consume another layer, but it may not silently replace its owner.

| Layer | Canonical owner | Responsibility |
|---|---|---|
| Public shell | `index.html` + public shell assets | Patient/public experience only |
| Admin shell | `admin.html` + `admin-shell.js` | Navigation, basic interaction, shell lifecycle |
| Admin application | `admin.js` | Authenticated admin state and feature orchestration |
| Authentication | Appwrite via `api/admin-auth.js` | Identity, session creation/restore, staff identity mapping |
| Feature modules | `*-center*.js`, domain modules | One bounded business capability per module |
| Backend API | `api/*.js` on Vercel | Server-side authorization and business/data boundary |
| Database | Neon PostgreSQL via Vercel backend | Canonical operational data and server-side contracts |
| Media editing | media-editor modules | Image/video presentation transforms only |
| Styling | dedicated CSS files | Visual system; no business logic |
| Build transformation | `qa/vercel-build.py` + `.github/patch-admin.py` | Deterministic build-time composition only |
| QA gates | `qa/*gate*.py`, browser E2E | Verification; never production feature ownership |
| Legacy migration evidence | `supabase/` | Historical/rollback evidence only; never production runtime |

## 2. Canonical runtime order

```text
HTML shell
  -> Admin Shell
  -> Appwrite Authentication
  -> Admin application state
  -> Feature modules
  -> Vercel API boundary
      -> Neon PostgreSQL
```

Public booking/data routes may enter through the Vercel API boundary directly when authentication is intentionally not required; validation, privacy, and write authorization remain server-side.

No feature module may be required for the shell to become interactive.

## 3. Security and secret boundary

```text
Provider Secret Store
  -> Vercel server environment
      -> Vercel API handler
          -> Appwrite / Neon

Browser
  -> receives only public data and HttpOnly session cookies
  -> never receives database credentials or privileged provider API keys
```

`DATABASE_URL`, `APPWRITE_API_KEY`, and any privileged provider credential are server-only. Browser bundles must fail certification if they contain privileged credentials or direct database-provider access.

## 4. Supabase retirement boundary

Supabase is retired from the AZAAD production runtime. The repository may retain historical Supabase functions/migrations because they document prior security/data contracts, but they are not deployable production ownership.

No new feature may introduce a Supabase runtime dependency. Existing legacy references are migrated one bounded domain at a time and must be removed from the canonical runtime path before certification.

The previous Supabase environment is not a reason to purchase quota or upgrade a plan. AZAAD's production requirement is free-only operation.

## 5. Repository tree

```text
/
├── public surfaces
│   ├── index.html
│   ├── patient/clinical public assets
│   └── shared public styles/scripts
├── admin
│   ├── admin.html
│   ├── admin-shell.js
│   ├── admin.js
│   ├── admin styles
│   └── bounded feature modules
├── api
│   ├── Appwrite-authenticated backend routes
│   └── Neon-backed business/data routes
├── build
│   ├── .github/patch-admin.py
│   └── qa/vercel-build.py
├── qa
│   ├── contract gates
│   ├── browser E2E
│   └── build integrity gates
├── docs
│   └── architecture and operational contracts
└── legacy evidence
    └── supabase/  (historical only)
```

## 6. Anti-duplication rules

1. One authoritative Admin Shell. Recovery scripts cannot become a second controller.
2. One authentication owner. Login/logout/session restoration must not be reimplemented by feature modules.
3. One build composition owner. Injectors must be idempotent and cannot append competing controllers.
4. One i18n owner per surface.
5. One media-transform owner. UI stores transforms; original media remains immutable.
6. QA scripts verify contracts; they do not patch production behavior after the fact.
7. One production data authority: Neon. Legacy providers cannot silently become fallback data sources.

## 7. Refactoring policy

Do not perform a mass file move in one change. First establish ownership, prove references, migrate one bounded domain, run build/E2E, then remove the retired implementation. This preserves causal history and prevents a cosmetic tree cleanup from becoming another production outage.
