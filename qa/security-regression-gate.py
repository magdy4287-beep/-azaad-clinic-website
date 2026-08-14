#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
paths = [
    "admin.html", "app.js", "admin-enhancements-v1.js", "public-ui.js"
]
text = "\n".join((ROOT / p).read_text(encoding="utf-8") for p in paths if (ROOT / p).exists())

# Security-only checks. Patient/MRN behavior is covered by the dedicated
# Patient 360 and Appointment contract gates; this gate must not require
# production/sample patient identifiers to be embedded in UI source files.
checks = {
    "no service-role secret assignment": r"SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['\"](?:eyJ|sb_secret_)[A-Za-z0-9._-]+",
    "no service-role JWT assignment": r"service_role\s*[:=]\s*['\"]eyJ[A-Za-z0-9._-]+",
    "no hardcoded OpenAI secret": r"sk-[A-Za-z0-9_-]{20,}",
    "audit/security terminology": r"audit|security|permission|role",
}
for name, pattern in checks.items():
    hits = re.findall(pattern, text, re.I)
    if name.startswith("no "):
        ok = not hits
    else:
        ok = bool(hits)
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
    if not ok:
        raise SystemExit(f"Security/regression gate failed: {name}")
print("Security/regression gate: PASS")
