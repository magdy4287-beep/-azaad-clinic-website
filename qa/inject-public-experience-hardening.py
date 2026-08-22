from pathlib import Path

path = Path('index.html')
if not path.exists():
    raise SystemExit('index.html not found')

text = path.read_text(encoding='utf-8')
old_tag = '<script src="public-experience-hardening.js?v=2026.08.22.1" defer></script>'
new_tag = '<script src="public-experience-hardening.js?v=2026.08.23.2" defer></script>'
# Normalize any prior injector/index copies to exactly one current asset.
while old_tag in text:
    text = text.replace(old_tag, '', 1)
text = text.replace(new_tag, '', 1)
marker = '<script src="app.js"></script>'
if marker not in text:
    raise SystemExit('public script marker not found in production index')
text = text.replace(marker, marker + new_tag, 1)
path.write_text(text, encoding='utf-8')

print('Public experience hardening injection complete')
