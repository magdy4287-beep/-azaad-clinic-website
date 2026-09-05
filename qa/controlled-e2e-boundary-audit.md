# Controlled E2E Boundary Audit

This document records the currently verified boundary mismatch for Controlled Evolution.

- Canonical admin runtime: Appwrite identity + Neon data (`api/admin-auth.js`).
- Legacy clinical fixture function: Supabase Auth + Supabase `clinic_staff` + Supabase RPC.
- Neon runtime branch contains the required clinical schema but currently has no `clinic_staff` rows.
- Therefore the clinical fixture boundary must not be treated as production-equivalent until it provisions and exercises the canonical Neon/Appwrite path.

Safety rules:
- no schema creation for this issue;
- no fallback from Neon to Supabase runtime data;
- no bypass of authorization checks;
- no manual production data seeding from CI;
- certification remains blocked until exact artifact and runtime parity is demonstrated.
