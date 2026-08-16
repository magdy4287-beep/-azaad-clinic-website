from pathlib import Path

path = Path('doctor-dashboard.html')
if not path.exists():
    raise SystemExit('doctor-dashboard.html not found')
text = path.read_text(encoding='utf-8')
tag = '<script src="./doctor-visit-actions.js" defer></script>'
if tag not in text:
    if '</body>' not in text:
        raise SystemExit('doctor-dashboard.html body marker not found')
    text = text.replace('</body>', tag + '\n</body>', 1)
    path.write_text(text, encoding='utf-8')
print('Doctor visit actions injection complete')
