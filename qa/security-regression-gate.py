#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
# Scan application/runtime files only. Test scripts themselves intentionally
# contain security-pattern strings and must not create false positives.
paths = [
    "admin.html", "app.js", "admin-enhancements-v1.js", "public-ui.js",
    "supabase-config.js"
]
text = "\n".join((ROOT / p).read_text(encoding="utf-8") for p in paths if (ROOT / p).exists())
checks = {
    "no service-role key": r"service[_ -]?role|SUPABASE_SERVICE_ROLE_KEY",
    "no hardcoded OpenAI secret": r"sk-[A-Za-z0-9_-]{20,}",
    "audit/security terminology": r"audit|security|permission|role",
    "patient identifier contract": r"AZA-\\d{6}|Patient 0",
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
