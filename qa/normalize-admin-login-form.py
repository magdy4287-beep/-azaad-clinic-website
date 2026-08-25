#!/usr/bin/env python3
"""Normalize the transformed Admin login form to one semantic loginForm before isolation gates."""
from pathlib import Path
import re

path = Path("admin.html")
text = path.read_text(encoding="utf-8")
form_re = re.compile(r"<form\b([^>]*)>(.*?)</form>", re.I | re.S)
forms = list(form_re.finditer(text))

login_forms = [m for m in forms if re.search(r"\bid\s*=\s*([\"'])loginForm\1", m.group(1), re.I)]
if len(login_forms) > 1:
    raise SystemExit("Admin login form count exceeds one")
if len(login_forms) == 1:
    print("ADMIN_LOGIN_FORM_NORMALIZE_PASS")
    raise SystemExit(0)

semantic = [
    m for m in forms
    if re.search(r"<input\b[^>]*\btype\s*=\s*([\"'])password\1", m.group(2), re.I)
    and re.search(r"<button\b[^>]*\btype\s*=\s*([\"'])submit\1", m.group(2), re.I)
]
if len(semantic) != 1:
    raise SystemExit("Unable to identify exactly one semantic Admin login form")

attrs = semantic[0].group(1)
attrs = re.sub(r"\s+\bid\s*=\s*([\"'])[^\"']*\1", "", attrs, count=1, flags=re.I)
normalized = '<form id="loginForm"' + attrs + '>' + semantic[0].group(2) + '</form>'
text = text[:semantic[0].start()] + normalized + text[semantic[0].end():]
path.write_text(text, encoding="utf-8")
print("ADMIN_LOGIN_FORM_NORMALIZE_PASS")
