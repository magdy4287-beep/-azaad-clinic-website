# AZAAD Engineering Architecture

## 1. Canonical ownership

The repository follows one-owner-per-responsibility. A feature may consume another layer, but it may not silently replace its owner.

| Layer | Canonical owner | Responsibility |
|---|---|---|
| Public shell | `index.html` + public shell assets | Patient/public experience only |
| Admin shell | `admin.html` + `admin-shell.js` | Navigation, basic interaction, shell lifecycle |
| Admin application | `admin.js` | Authenticated admin state and feature orchestration |
| Authentication | `admin-auth-ui-guard.js` / Supabase auth contract | Authentication and authorization only |
| Feature modules | `*-center*.js`, domain modules | One bounded business capability per module |
| Media editing | media-editor modules | Image/video presentation transforms only |
| Styling | dedicated CSS files | Visual system; no business logic |
| Build transformation | `qa/vercel-build.py` + `.github/patch-admin.py` | Deterministic build-time composition only |
| QA gates | `qa/*gate*.py`, browser E2E | Verification; never production feature ownership |
| Database | Supabase migrations/functions | Data, RLS, server-side contracts |

## 2. Canonical runtime order

```text
HTML shell
  -> Admin Shell
  -> Authentication
  -> Admin application state
  -> Feature modules
  -> Data/API operations
```

No feature module may be required for the shell to become interactive.

## 3. Repository tree

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
├── backend
│   ├── Supabase functions
│   └── database migrations/contracts
├── build
│   ├── .github/patch-admin.py
│   └── qa/vercel-build.py
├── qa
│   ├── contract gates
│   ├── browser E2E
│   └── build integrity gates
├── docs
│   └── architecture and operational contracts
└── configuration
    ├── package.json
    ├── vercel.json
    └── CI workflows
```

## 4. Anti-duplication rules

1. One authoritative Admin Shell. Recovery scripts cannot become a second controller.
2. One authentication owner. Login/logout/session restoration must not be reimplemented by feature modules.
3. One build composition owner. Injectors must be idempotent and cannot append competing controllers.
4. One i18n owner per surface.
5. One media-transform owner. UI stores transforms; original media remains immutable.
6. QA scripts verify contracts; they do not patch production behavior after the fact.

## 5. Refactoring policy

Do not perform a mass file move in one change. First establish ownership, prove references, migrate one bounded domain, run build/E2E, then remove the retired implementation. This preserves causal history and prevents a cosmetic tree cleanup from becoming another production outage.
