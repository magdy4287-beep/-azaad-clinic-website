"""Fail-closed Admin dependency graph and login-shell guard.

The Admin UI has exactly one canonical application/controller owner: admin.js.
There must be no competing login bootstrap, redirect login page, auth UI guard,
or duplicate external controller. The login form may only contain a declarative
native-navigation guard; credential/session processing remains in admin.js.
"""
from pathlib import Path
import re
from urllib.parse import urlsplit

path = Path("admin.html")
if not path.exists():
    raise SystemExit("admin.html missing")

text = path.read_text(encoding="utf-8")
scripts = re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>', text, re.I)
seen = {}
duplicates = []
for src in scripts:
    parsed = urlsplit(src)
    key = (parsed.path or src).lstrip('/').lower()
    if key in seen:
        duplicates.append((key, seen[key], src))
    else:
        seen[key] = src

if duplicates:
    details = "; ".join(f"{key}: {first} / {second}" for key, first, second in duplicates)
    raise SystemExit(f"Admin external script duplication detected: {details}")

for forbidden in (
    "admin-ui-failsafe.js",
    "admin-login-controller.js",
    "admin-login-bootstrap.js",
    "admin-auth-ui-guard.js",
):
    if any((urlsplit(src).path or src).lstrip('/').lower() == forbidden for src in scripts):
        raise SystemExit(f"Retired competing Admin controller still injected: {forbidden}")

admin_refs = [
    src for src in scripts
    if (urlsplit(src).path or src).lstrip('/').lower() == 'admin.js'
]
if len(admin_refs) != 1:
    raise SystemExit(f"Canonical admin.js must be referenced exactly once; found {len(admin_refs)}")

login_forms = re.findall(r'<form\b[^>]*\bid=["\']loginForm["\'][^>]*>', text, re.I)
if len(login_forms) != 1:
    raise SystemExit(f"Canonical #loginForm must exist exactly once; found {len(login_forms)}")

if not re.search(
    r'<form\b[^>]*\bid=["\']loginForm["\'][^>]*\bonsubmit=["\']event\.preventDefault\(\);["\']',
    text,
    re.I,
):
    raise SystemExit("#loginForm is missing the pre-module native-navigation guard")

if "window.__AZAAD_ADMIN_SHELL__" in text and text.count("window.__AZAAD_ADMIN_SHELL__") > 1:
    raise SystemExit("Admin shell marker duplicated")

print(f"[AZAAD admin graph] PASS: {len(scripts)} unique external scripts; one shell; one canonical admin.js controller; no competing login controller; pre-module form guard present")
