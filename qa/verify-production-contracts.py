from pathlib import Path
import re

ROOT = Path('.')

def read(name):
    return (ROOT / name).read_text(encoding='utf-8')

admin = read('admin.js')
app = read('app.js')
index = read('index.html')
admin_html = read('admin.html')

# Admin authentication is Appwrite-backed at runtime. Legacy Supabase auth
# configuration must not survive the canonical production artifact.
assert 'const SUPABASE_AUTH_STORAGE_KEY' not in admin, 'legacy Supabase auth storage key remains in admin.js'
assert 'detectSessionInUrl:' not in admin, 'legacy Supabase URL-session policy remains in admin.js'
assert 'sb-derofsthjivlkcdnojww-auth-token' not in admin, 'legacy Supabase auth storage key leaked into admin.js'
assert admin.count('/api/admin-auth') >= 2, 'Appwrite admin-auth boundary is missing from login/restore/logout runtime'
assert "state.provider = 'appwrite'" in admin, 'Appwrite provider marker is missing from admin runtime'

# Public booking is direct. The obsolete phone-first lookup gate must be absent.
assert 'patient-booking-gate.js' not in index, 'obsolete patient phone-first gate is still loaded'
assert 'bookingForm' in app, 'public booking form is missing'
assert 'booking_code' in app, 'booking code contract is missing'
assert 'phone' in app.lower(), 'patient phone field is missing from direct booking'
assert 'name' in app.lower(), 'patient name field is missing from direct booking'

# Guard against accidental duplicate central i18n execution in generated pages.
for name, html in [('index.html', index), ('admin.html', admin_html)]:
    count = len(re.findall(r'<script[^>]+src=["\'][^"\']*central-i18n\.js(?:\?[^"\']*)?["\']', html, flags=re.I))
    assert count <= 1, f'{name} loads central-i18n.js {count} times'

print('Production contract verification: PASS')
print('Admin auth: Appwrite canonical runtime boundary')
print('Public booking: direct patient booking without phone-first lookup')
print('central-i18n: no duplicate script tags')
