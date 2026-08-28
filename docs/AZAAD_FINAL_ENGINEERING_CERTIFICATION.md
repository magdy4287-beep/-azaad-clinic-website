# AZAAD — Final Engineering Certification Record

## Release candidate

- Repository: `magdy4287-beep/-azaad-clinic-website`
- Production URL: `https://azaad-clinic-website.vercel.app`
- Certified production SHA: `fb8372ddb89210da9665d44da4867e5b729f6a55`
- Browser E2E Run: `33161589438`
- Browser E2E Job: `98817098510`

## Evidence

- Canonical build: PASS
- Vercel production deployment: READY
- Exact production SHA verification: PASS
- Production admin runtime invariants: PASS
- Browser E2E: 19/19 PASS
- Production certification policy: PASS
- Patient Portal route: PASS
- Patient authentication boundary: PASS
- Admin authentication and authenticated flow: PASS
- Patient 360 bridge: PASS
- Staff login API: PASS
- Control plane: PASS
- AI fail-closed policy: PASS
- Arabic/English round trip: PASS
- Phone/tablet/laptop/desktop responsive checks: PASS
- Doctor/post media integrity: PASS
- Centralized Admin language controls: PASS

## Data and security controls

- Operational booking reporting excludes `E2E-%` fixtures.
- Patient access is patient-scoped and server-authorized.
- Internal SECURITY DEFINER RPCs no longer expose `EXECUTE` to `anon` where restricted.
- AI actor foreign-key indexes were added for the audited tables.

## Certification conclusion

The certified Production candidate is verified by an exact-SHA Browser E2E run against the live Vercel Production URL. No legacy artifact was substituted for the certified SHA.

Final status: **PRODUCTION VERIFIED**
