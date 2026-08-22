from pathlib import Path

path = Path('index.html')
if not path.exists():
    raise SystemExit('index.html not found')

text = path.read_text(encoding='utf-8')
tag = '<script src="public-experience-hardening.js?v=2026.08.22.1" defer></script>'
if tag not in text:
    marker = '<script src="app.js"></script>'
    if marker not in text:
        raise SystemExit('public script marker not found in production index')
    text = text.replace(marker, marker + tag, 1)
    path.write_text(text, encoding='utf-8')

print('Public experience hardening injection complete')
