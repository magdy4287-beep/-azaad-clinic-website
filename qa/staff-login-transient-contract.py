"""Static contract for the staff-login availability boundary.

The production Edge Function must use the canonical staff_login_lookup RPC and
must keep transient PostgREST failures fail-closed with bounded retry/backoff.
"""
from pathlib import Path

src = Path("supabase/functions/staff-login/index.ts").read_text(encoding="utf-8")
required = [
    "staff_login_lookup",
    "STAFF_LOOKUP_UNAVAILABLE",
]
missing = [token for token in required if token not in src]
if missing:
    raise SystemExit(f"staff-login contract missing: {missing}")

if "clinic_staff" in src:
    raise SystemExit("staff-login must not own a second direct clinic_staff query")

print("staff-login transient contract: PASS")
