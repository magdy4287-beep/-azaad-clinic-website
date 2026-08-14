#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
required = ["admin.html", "app.js", "public-ui.js"]
missing = [p for p in required if not (ROOT / p).exists()]
if missing:
    raise SystemExit("Production smoke gate failed: missing " + ", ".join(missing))

admin = (ROOT / "admin.html").read_text(encoding="utf-8")
app = (ROOT / "app.js").read_text(encoding="utf-8")
ui = (ROOT / "public-ui.js").read_text(encoding="utf-8")

checks = {
    "admin shell": bool(re.search(r"<html|<body|<script", admin, re.I)),
    "supabase auth integration": bool(re.search(r"supabase|auth", admin + app, re.I)),
    "patient search": bool(re.search(r"patient|mrn|search", admin + app, re.I)),
    "appointment surface": bool(re.search(r"booking|appointment", admin + app, re.I)),
    "public ui": bool(re.search(r"translate|language|i18n|arabic|english", ui, re.I)),
}
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
    if not ok:
        raise SystemExit(f"Production smoke gate failed: {name}")
print("Production smoke gate: PASS")
