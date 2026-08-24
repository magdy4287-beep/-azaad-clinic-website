from pathlib import Path
import re

ROOT = Path('.')

def read(name):
    return (ROOT / name).read_text(encoding='utf-8')

admin = read('admin.js')
app = read('app.js')
index = read('index.html')
admin_html = read('admin.html')

# One browser auth contract only.
assert admin.count('const SUPABASE_AUTH_STORAGE_KEY = "azaad-clinic-admin-auth";') == 1, 'admin.js must define exactly one canonical auth storage key'
assert 'sb-derofsthjivlkcdnojww-auth-token' not in admin, 'legacy Supabase auth storage key leaked into admin.js'
assert admin.count('detectSessionInUrl: false') == 1, 'admin.js must have one explicit URL-session policy'

# Public booking is direct. The obsolete phone-first lookup gate must be absent.
assert 'patient-booking-gate.js' not in index, 'obsolete patient phone-first gate is still loaded'
assert 'bookingForm' in app, 'public booking form is missing'
assert 'booking_code' in app, 'booking code contract is missing'
assert 'phone' in app.lower(), 'patient phone field is missing from direct booking'
assert 'name' in app.lower(), 'patient name field is missing from direct booking'

# Guard against accidental duplicate central i18n execution in the generated pages.
for name, html in [('index.html', index), ('admin.html', admin_html)]:
    count = len(re.findall(r'<script[^>]+src=["\'][^"\']*central-i18n\\.js(?:\\?[^"\']*)?["\']', html, flags=re.I))
    assert count <= 1, f'{name} loads central-i18n.js {count} times'

print('Production contract verification: PASS')
print('Admin auth: canonical single storage key')
print('Public booking: direct patient booking without phone-first lookup')
print('central-i18n: no duplicate script tags')
