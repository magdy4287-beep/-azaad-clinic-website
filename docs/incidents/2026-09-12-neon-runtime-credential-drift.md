# Incident — Neon runtime credential drift (2026-09-12)

## Observed symptom

Vercel runtime error aggregation reported `NeonDbError: password authentication failed for user 'neondb_owner'` on the canonical `/api/public-clinic-data` and `/api/admin-auth` routes.

The error was observed in the previous 24-hour window and is not currently recurring in the latest six-hour runtime-error window. Absence of recent traffic/errors is not proof that the configuration is correct.

## Root-cause classification

The canonical Neon production database is reachable and healthy from the Neon control plane. A read-only query against the `production` branch succeeds as `neondb_owner` and confirms the required clinic tables exist.

Therefore the failure class is **runtime credential/target drift at Vercel**, not a missing Neon schema or a browser/provider architecture problem.

## Required remediation

1. In Vercel Project Settings → Environment Variables, inspect the **Production** `DATABASE_URL` entry without exposing its value in logs or chat.
2. Reconcile it with the current connection string for the canonical Neon `production` branch/database.
3. Keep the variable server-only and sensitive; never place it in source control or any `NEXT_PUBLIC_*`/browser variable.
4. Redeploy after changing the variable. Vercel environment-variable changes take effect on a new deployment.
5. Verify `/api/admin-auth?action=runtime-health` reports `status=ok` and `databaseTargetMatches=true` on the fresh deployment.
6. Re-run exact-SHA browser/auth and production smoke evidence before release.

## Prevention

The application already contains a runtime-health boundary that fingerprints the non-secret database target and checks canonical tables. Future release certification must treat a failed database target match or database reachability check as a hard blocker.

No password, connection string, or secret value belongs in this incident document.
