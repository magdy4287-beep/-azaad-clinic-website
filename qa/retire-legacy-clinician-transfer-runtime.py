from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "clinical-assessment.html"
SCRIPT = "clinician-transfer-widget.js"

if not TARGET.is_file():
    raise SystemExit("FAIL-CLOSED: clinical-assessment.html is missing")

text = TARGET.read_text(encoding="utf-8")
pattern = re.compile(r'<script\b[^>]*\bsrc=["\']([^"\']*clinician-transfer-widget\.js(?:\?[^"\']*)?)["\'][^>]*>\s*</script>\s*', re.I)
text, removed = pattern.subn("", text)
if removed == 0:
    raise SystemExit("FAIL-CLOSED: legacy clinician transfer runtime was expected after Admin patch but was not found")
if re.search(r'<script\b[^>]*\bsrc=["\'][^"\']*clinician-transfer-widget\.js(?:\?[^"\']*)?["\']', text, re.I):
    raise SystemExit("FAIL-CLOSED: clinician transfer runtime owner remains in production clinical artifact")
TARGET.write_text(text, encoding="utf-8")
print(f"[AZAAD legacy clinician transfer retirement] PASS: removed {removed} unsupported Supabase transfer runtime owner from production clinical artifact")
