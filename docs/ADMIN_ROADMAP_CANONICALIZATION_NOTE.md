# Admin Roadmap Canonicalization Note

## Status

The historical `ADMIN_ROADMAP.md` predates the current production architecture and is retained as historical planning evidence. It must not be interpreted as a runtime ownership document.

## Current production architecture

- Vercel is the production runtime.
- Appwrite owns canonical identity and authenticated session boundaries.
- Neon owns the canonical production database/data boundary.
- Supabase is legacy migration/DR evidence only and is not a production browser/server runtime owner.

## Engineering rule

Any future administration roadmap work must describe the current Appwrite + Neon production boundaries and must not direct new production work toward the retired Supabase runtime. Historical Supabase functions and migrations remain preserved only where required for migration evidence, rollback/DR evidence, or documented historical diagnostics.
