from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'admin.html'
if not path.is_file():
    raise SystemExit('FAIL-CLOSED: admin.html missing while retiring legacy patient session bridge')

text = path.read_text(encoding='utf-8')
pattern = re.compile(
    r'\s*<script\b[^>]*\bsrc=["\'][^"\']*patient-session-bridge-v3\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\s*',
    re.I,
)
text = pattern.sub('\n', text)
remaining = re.findall(r'<script\b[^>]*\bsrc=["\'][^"\']*patient-session-bridge-v3\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>', text, flags=re.I)
if remaining:
    raise SystemExit('FAIL-CLOSED: legacy patient session bridge still referenced by Admin artifact')
path.write_text(text, encoding='utf-8')
print('[AZAAD legacy patient session bridge retirement] PASS: Admin no longer loads retired duplicate auth runtime')
