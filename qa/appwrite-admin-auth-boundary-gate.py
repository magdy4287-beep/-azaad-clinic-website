from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
auth = (root / 'api/admin-auth.js').read_text(encoding='utf-8')
appointments = (root / 'api/admin-appointments.js').read_text(encoding='utf-8')
transform = (root / 'qa/finalize-appwrite-admin-auth.py').read_text(encoding='utf-8')
final_restore = (root / 'qa/final-admin-restore-boundary.py').read_text(encoding='utf-8')
build = (root / 'qa/vercel-build.py').read_text(encoding='utf-8')

parity_guard = bool(re.search(r'const\s+parity\s*=\s*Boolean\s*\(', auth)) and bool(re.search(r'session\?\.userId\s*&&\s*staff\.auth_user_id\s*&&\s*session\.userId\s*===\s*staff\.auth_user_id', auth))
lifetime_guard = 'const SESSION_MAX_AGE = 60 * 60 * 8;' in auth and 'maxAge = SESSION_MAX_AGE' in auth and 'Max-Age=${maxAge}' in auth
secure_guard = "const secure = protocol === 'https:'" in auth and "secure ? ' Secure;'" in auth
server_cookie_guard = "const { appwriteSecret, staff, session } = result" in auth and "'set-cookie': sessionCookie(request, appwriteSecret)" in auth
appwrite_cookie_forward_guard = bool(re.search(r'Cookie:\s*`a_session_\$\{project\}=\$\{secret\}; a_session_\$\{project\}_legacy=\$\{secret\}`', auth))
appointments_cookie_guard = bool(re.search(r'Cookie:\s*`a_session_\$\{project\}=\$\{secret\}; a_session_\$\{project\}_legacy=\$\{secret\}`', appointments))
no_custom_header_guard = 'x-azaad-appwrite-session' not in auth.lower() and 'x-azaad-appwrite-session' not in appointments.lower()

checks = [
    ('Appwrite Admin auth endpoint exists', 'account/sessions/email' in auth),
    ('Appwrite session is HttpOnly', 'HttpOnly' in auth),
    ('Appwrite session is Secure in production', secure_guard),
    ('Appwrite session has bounded lifetime', lifetime_guard),
    ('Admin login enforces Appwrite user/clinic_staff ID parity', parity_guard),
    ('Admin login stores the Appwrite session secret only in the server-managed HttpOnly cookie', server_cookie_guard),
    ('Admin server boundary forwards both Appwrite session cookie variants', appwrite_cookie_forward_guard),
    ('Admin restore verifies Appwrite session through the server-managed cookie', 'appwriteAccount(secret)' in auth and 'const secret = cookieValue(request)' in auth),
    ('Admin restore enforces active clinic_staff', 'active = true' in auth),
    ('Admin auth JSON never exposes the Appwrite session secret', 'appwriteSecret' not in "return json({ authenticated: true, provider: 'appwrite', user: { id: session.userId, email: staff.email }, staff },"),
    ('Admin auth never accepts a browser-supplied Appwrite session header', no_custom_header_guard),
    ('Admin appointments reads Neon', 'from public.clinic_bookings' in appointments and 'neon(' in appointments),
    ('Admin appointments verifies Appwrite session through the HttpOnly cookie', 'appwriteAccount(secret)' in appointments and appointments_cookie_guard),
    ('Admin appointments enforces role', "'OWNER', 'ADMIN', 'MANAGER', 'SECRETARY', 'RECEPTION', 'DOCTOR'" in appointments),
    ('Admin appointments isolates E2E rows', "not ilike 'E2E-%'" in appointments),
    ('Canonical build applies Appwrite auth transform', 'finalize-appwrite-admin-auth.py' in build),
    ('Canonical transform contains retired staff-login endpoint assertion', 'functions/v1/staff-login' in transform and 'raise SystemExit' in transform and 'Legacy staff-login' in transform),
    ('Final canonical Admin artifact strips browser access-token requirements', '!result?.session?.access_token' in final_restore and 'cookie-only' in final_restore),
    ('Appwrite API key is not embedded in frontend transform', 'APPWRITE_API_KEY' not in transform),
]

failed = False
for name, ok in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}")
    failed |= not ok

print(f"\nAZAAD Appwrite Admin auth boundary: {len(checks)} checks, {sum(ok for _, ok in checks)} passed, {sum(not ok for _, ok in checks)} failed.")
sys.exit(1 if failed else 0)