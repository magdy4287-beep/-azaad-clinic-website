from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / "admin.js").read_text(encoding="utf-8")

checks = []
def check(name, ok, detail=""):
    checks.append((name, ok, detail))

check(
    "Admin booking owner is the Appwrite-authorized Neon boundary",
    "/api/admin-appointments" in admin,
)
check(
    "Admin booking loader sends the authenticated Appwrite session credential",
    "Authorization: `Bearer ${state.session.access_token}`" in admin,
)
check(
    "Admin booking loader uses browser credentials for the HttpOnly session",
    'credentials: "include"' in admin,
)
check(
    "Admin booking loader does not query clinic_bookings directly",
    not re.search(r'\.from\(\s*["\']clinic_bookings["\']\s*\)', admin),
)
check(
    "Admin booking state remains a single consumer-owned store",
    "state.bookings = Array.isArray(payload?.appointments)" in admin,
)
check(
    "Admin booking boundary cannot silently fall back to browser-local Supabase data",
    "supabase.from(\"clinic_bookings\")" not in admin and "supabase.from('clinic_bookings')" not in admin,
)

failed = False
for name, ok, detail in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    failed |= not ok

print(f"\nAZAAD Admin backend boundary: {len(checks)} checks, {sum(ok for _, ok, _ in checks)} passed, {sum(not ok for _, ok, _ in checks)} failed.")
sys.exit(1 if failed else 0)
