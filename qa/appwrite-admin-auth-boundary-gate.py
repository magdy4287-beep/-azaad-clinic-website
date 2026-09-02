from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
auth = (root / 'api/admin-auth.js').read_text(encoding='utf-8')
appointments = (root / 'api/admin-appointments.js').read_text(encoding='utf-8')
transform = (root / 'qa/finalize-appwrite-admin-auth.py').read_text(encoding='utf-8')

checks = [
    ('Appwrite Admin auth endpoint exists', "'/account/sessions/email'" in auth),
    ('Appwrite session is HttpOnly', 'HttpOnly' in auth),
    ('Appwrite session is Secure', 'Secure' in auth),
    ('Appwrite session has bounded lifetime', 'SESSION_MAX_AGE' in auth and 'Max-Age=${SESSION_MAX_AGE}' in auth),
    ('Admin login enforces Appwrite user/clinic_staff ID parity', 'session.userId !== staff.auth_user_id' in auth),
    ('Admin restore verifies Appwrite session', "'/account'" in auth and "X-Appwrite-Session" in auth),
    ('Admin restore enforces active clinic_staff', 'active = true' in auth),
    ('Admin appointments reads Neon', "from public.clinic_bookings" in appointments and "neon(" in appointments),
    ('Admin appointments verifies Appwrite session', 'appwriteAccount' in appointments and 'X-Appwrite-Session' in appointments),
    ('Admin appointments enforces role', "['OWNER', 'ADMIN', 'MANAGER', 'SECRETARY', 'RECEPTION', 'DOCTOR']" in appointments),
    ('Admin appointments isolates E2E rows', "not ilike 'E2E-%'" in appointments),
    ('Canonical build applies Appwrite auth transform', 'finalize-appwrite-admin-auth.py' in (root / 'qa/vercel-build.py').read_text(encoding='utf-8')),
    ('Canonical transform rejects legacy staff-login fetch', 'Legacy staff-login fetch remains' in transform),
    ('Canonical transform rejects legacy staff-login marker', 'Legacy STAFF_LOGIN_FUNCTION remains' in transform),
    ('Appwrite API key is not embedded in frontend transform', 'APPWRITE_API_KEY' not in transform),
]

failed = False
for name, ok in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}")
    failed |= not ok

print(f"\nAZAAD Appwrite Admin auth boundary: {len(checks)} checks, {sum(ok for _, ok in checks)} passed, {sum(not ok for _, ok in checks)} failed.")
sys.exit(1 if failed else 0)
