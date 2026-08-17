from pathlib import Path

path = Path('doctor-dashboard.html')
if not path.exists():
    raise SystemExit('doctor-dashboard.html not found')
text = path.read_text(encoding='utf-8')
tag = '<script src="./doctor-dashboard-reliability.js?v=20260817-01" defer></script>'
if tag not in text:
    marker = '<script src="doctor-dashboard.js?v=20260817-03" defer></script>'
    if marker in text:
        text = text.replace(marker, marker + '\n' + tag, 1)
    elif '</body>' in text:
        text = text.replace('</body>', tag + '\n</body>', 1)
    else:
        raise SystemExit('doctor dashboard body marker not found')
    path.write_text(text, encoding='utf-8')
print('Doctor dashboard reliability injection complete')
