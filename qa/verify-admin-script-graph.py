"""Fail-closed Admin dependency graph guard.

The Admin UI has exactly one canonical application/controller owner: admin.js.
There must be no competing login bootstrap, redirect login page, or duplicate
external controller.
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
):
    if any((urlsplit(src).path or src).lstrip('/').lower() == forbidden for src in scripts):
        raise SystemExit(f"Retired competing Admin controller still injected: {forbidden}")

admin_refs = [
    src for src in scripts
    if (urlsplit(src).path or src).lstrip('/').lower() == 'admin.js'
]
if len(admin_refs) != 1:
    raise SystemExit(f"Canonical admin.js must be referenced exactly once; found {len(admin_refs)}")

if text.count("window.__AZAAD_ADMIN_SHELL__") > 1:
    raise SystemExit("Admin shell marker duplicated")

print(f"[AZAAD admin graph] PASS: {len(scripts)} unique external scripts; one shell; one canonical admin.js controller; no login bootstrap")
