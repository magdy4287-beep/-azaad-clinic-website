from pathlib import Path

# Canonical ownership moved patient-appointment-actions.js into the Admin
# lazy bookings registry. Do not inject a second executable copy here.
# The file remains intentionally as a no-op build stage so existing pipeline
# ordering stays stable without creating duplicate runtime ownership.
path = Path('admin.html')
if not path.exists():
    raise SystemExit('admin.html not found')

text = path.read_text(encoding='utf-8')
legacy_tag = '<script src="./patient-appointment-actions.js" defer></script>'
if legacy_tag in text:
    text = text.replace(legacy_tag, '', 1)
    path.write_text(text, encoding='utf-8')

print('Patient appointment actions remain owned exclusively by lazy-admin-modules.py')
