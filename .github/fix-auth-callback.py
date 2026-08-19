from pathlib import Path

# Production-parity authentication fix belongs to the real admin.html runtime.
# Do not mutate admin.js here: admin.html owns the canonical login form on the
# certified browser surface. The Supabase auth callback must remain synchronous
# so setSession() can complete before login() continues to shell initialization.
script = Path("qa/fix-admin-inline-auth.py")
if not script.exists():
    raise SystemExit("qa/fix-admin-inline-auth.py not found")
exec(script.read_text(encoding="utf-8"), {"__name__": "__main__"})
print("Auth callback fix applied to canonical admin.html; admin.js left untouched.")
