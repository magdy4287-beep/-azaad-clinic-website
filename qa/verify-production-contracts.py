from pathlib import Path
import re

ROOT = Path('.')

def read(name):
    return (ROOT / name).read_text(encoding='utf-8')

admin = read('admin.js')
booking = read('patient-booking-gate.js')
index = read('index.html')
admin_html = read('admin.html')

# One browser auth contract only.
assert admin.count('const SUPABASE_AUTH_STORAGE_KEY = "azaad-clinic-admin-auth";') == 1, 'admin.js must define exactly one canonical auth storage key'
assert 'sb-derofsthjivlkcdnojww-auth-token' not in admin, 'legacy Supabase auth storage key leaked into admin.js'
assert admin.count('detectSessionInUrl: false') == 1, 'admin.js must have one explicit URL-session policy'

# Public booking is opaque-ID-only. Internal clinic workflows may continue to use MRN;
# this assertion is intentionally scoped to the public booking gate only.
for forbidden in ('patient_mrn', 'found.mrn', 'found.patient_name', 'found.patient_phone', 'upcoming_bookings'):
    assert forbidden not in booking, f'public booking gate contains forbidden private lookup contract: {forbidden}'

# Guard against accidental duplicate central i18n execution in the generated pages.
for name, html in [('index.html', index), ('admin.html', admin_html)]:
    count = len(re.findall(r'<script[^>]+src=["\'][^"\']*central-i18n\.js(?:\?[^"\']*)?["\']', html, flags=re.I))
    assert count <= 1, f'{name} loads central-i18n.js {count} times'

print('Production contract verification: PASS')
print('Admin auth: canonical single storage key')
print('Public booking: opaque patient_id only')
print('Public booking: no MRN/name/phone/upcoming lookup fields')
print('central-i18n: no duplicate script tags')
