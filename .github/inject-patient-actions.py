from pathlib import Path

path = Path('admin.html')
if not path.exists():
    raise SystemExit('admin.html not found')

text = path.read_text(encoding='utf-8')
tag = '<script src="./patient-appointment-actions.js" defer></script>'
if tag not in text:
    if '</body>' not in text:
        raise SystemExit('admin.html body marker not found')
    text = text.replace('</body>', tag + '\n</body>', 1)
    path.write_text(text, encoding='utf-8')

print('Patient 360 appointment actions injection complete')
