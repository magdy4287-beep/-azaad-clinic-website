from pathlib import Path

path = Path('index.html')
if not path.exists():
    raise SystemExit('index.html not found')

text = path.read_text(encoding='utf-8')
tags = [
    '<script src="./patient-profile-booking.js?v=2026.08.17.1" defer></script>',
    '<script src="./patient-branding.js?v=2026.08.17.1" defer></script>',
]
if '</body>' not in text:
    raise SystemExit('index.html body marker not found')
for tag in tags:
    if tag not in text:
        text = text.replace('</body>', tag + '\n</body>', 1)
path.write_text(text, encoding='utf-8')

print('Official Azaad patient profile and branding injection complete')
