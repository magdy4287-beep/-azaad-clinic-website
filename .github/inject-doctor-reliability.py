from pathlib import Path

path = Path('doctor-dashboard.html')
if not path.exists():
    raise SystemExit('doctor-dashboard.html not found')
text = path.read_text(encoding='utf-8')
reliability = '<script src="./doctor-dashboard-reliability.js?v=20260817-04" defer></script>'
universal = '<script src="./doctor-dashboard-universal.js?v=20260817-01" defer></script>'
marker = '<script src="doctor-dashboard.js?v=20260817-03" defer></script>'
if reliability not in text:
    text = text.replace(marker, marker + '\n' + reliability, 1) if marker in text else text.replace('</body>', reliability + '\n</body>', 1)
if universal not in text:
    text = text.replace(reliability, reliability + '\n' + universal, 1) if reliability in text else text.replace('</body>', universal + '\n</body>', 1)
path.write_text(text, encoding='utf-8')
print('Doctor dashboard reliability + universal injection complete')
