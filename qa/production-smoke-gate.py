#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
required = ["admin.html", "admin.js", "app.js", "public-ui.js", "api/admin-auth.js"]
missing = [p for p in required if not (ROOT / p).exists()]
if missing:
    raise SystemExit("Production smoke gate failed: missing " + ", ".join(missing))

admin = (ROOT / "admin.html").read_text(encoding="utf-8")
admin_js = (ROOT / "admin.js").read_text(encoding="utf-8")
app = (ROOT / "app.js").read_text(encoding="utf-8")
ui = (ROOT / "public-ui.js").read_text(encoding="utf-8")
auth_api = (ROOT / "api/admin-auth.js").read_text(encoding="utf-8")

checks = {
    "admin shell": bool(re.search(r"<html|<body|<script", admin, re.I)),
    "canonical Appwrite admin auth": "/api/admin-auth" in admin_js and "provider: 'appwrite'" in auth_api,
    "Neon server boundary": "@neondatabase/serverless" in auth_api and "DATABASE_URL" in auth_api,
    "patient search": bool(re.search(r"patient|mrn|search", admin + app, re.I)),
    "appointment surface": bool(re.search(r"booking|appointment", admin + app, re.I)),
    "public ui": bool(re.search(r"translate|language|i18n|arabic|english", ui, re.I)),
    "no retired provider marker": not re.search(r"supabase\.co|@supabase/|SUPABASE_|functions/v1/", admin + admin_js + app + ui + auth_api, re.I),
}
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
    if not ok:
        raise SystemExit(f"Production smoke gate failed: {name}")
print("Production smoke gate: PASS")
