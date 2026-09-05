from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
auth = (root / 'api/admin-auth.js').read_text(encoding='utf-8')
appointments = (root / 'api/admin-appointments.js').read_text(encoding='utf-8')
transform = (root / 'qa/finalize-appwrite-admin-auth.py').read_text(encoding='utf-8')
build = (root / 'qa/vercel-build.py').read_text(encoding='utf-8')

parity_guard = bool(re.search(r'const\s+parity\s*=\s*Boolean\s*\(', auth)) and bool(
    re.search(r'session\?\.userId\s*&&\s*staff\.auth_user_id\s*&&\s*session\.userId\s*===\s*staff\.auth_user_id', auth)
)

lifetime_guard = bool(re.search(r'const\s+SESSION_MAX_AGE\s*=\s*60\s*\*\s*60\s*8\s*;', auth)) and bool(
    re.search(r'Max-Age=\$\{SESSION_MAX_AGE\}', auth)
)

checks = [
    ('Appwrite Admin auth endpoint exists', 'account/sessions/email' in auth),
    ('Appwrite session is HttpOnly', 'HttpOnly' in auth),
    ('Appwrite session is Secure', 'Secure' in auth),
    ('Appwrite session has bounded lifetime', lifetime_guard),
    ('Admin login enforces Appwrite user/clinic_staff ID parity', parity_guard),
    ('Admin restore verifies Appwrite session', 'account' in auth and 'X-Appwrite-Session' in auth),
    ('Admin restore enforces active clinic_staff', 'active = true' in auth),
    ('Admin appointments reads Neon', 'from public.clinic_bookings' in appointments and 'neon(' in appointments),
    ('Admin appointments verifies Appwrite session', 'appwriteAccount' in appointments and 'X-Appwrite-Session' in appointments),
    ('Admin appointments enforces role', "'OWNER', 'ADMIN', 'MANAGER', 'SECRETARY', 'RECEPTION', 'DOCTOR'" in appointments),
    ('Admin appointments isolates E2E rows', "not ilike 'E2E-%'" in appointments),
    ('Canonical build applies Appwrite auth transform', 'finalize-appwrite-admin-auth.py' in build),
    ('Canonical transform contains retired staff-login endpoint assertion', 'functions/v1/staff-login' in transform and 'raise SystemExit' in transform and 'Legacy staff-login' in transform),
    ('Canonical transform rejects legacy staff-login marker', 'Legacy STAFF_LOGIN_FUNCTION remains' in transform),
    ('Appwrite API key is not embedded in frontend transform', 'APPWRITE_API_KEY' not in transform),
]

failed = False
for name, ok in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}")
    failed |= not ok

print(f"\nAZAAD Appwrite Admin auth boundary: {len(checks)} checks, {sum(ok for _, ok in checks)} passed, {sum(not ok for _, ok in checks)} failed.")
sys.exit(1 if failed else 0)
