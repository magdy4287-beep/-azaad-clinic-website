"""Fail-closed Admin dependency graph guard.

The Admin UI has exactly one emergency shell. Feature modules may be lazy-loaded,
but competing global controllers and duplicate external script tags are forbidden.
The dependency-free login bootstrap is a required pre-controller guard so a slow
module import cannot fall back to native form navigation.
"""
from pathlib import Path
import re
from urllib.parse import urlsplit

path = Path("admin.html")
if not path.exists():
    raise SystemExit("admin.html missing")

if not Path("admin-login-bootstrap.js").is_file():
    raise SystemExit("Admin login bootstrap file is missing")

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

# These controllers used to compete for the same global events and are intentionally retired.
for forbidden in ("admin-ui-failsafe.js", "admin-login-controller.js"):
    if any((urlsplit(src).path or src).lstrip('/').lower() == forbidden for src in scripts):
        raise SystemExit(f"Retired competing Admin controller still injected: {forbidden}")

bootstrap_refs = [
    src for src in scripts
    if (urlsplit(src).path or src).lstrip('/').lower() == 'admin-login-bootstrap.js'
]
if len(bootstrap_refs) != 1:
    raise SystemExit(f"Admin login bootstrap must be referenced exactly once; found {len(bootstrap_refs)}")

if text.count("window.__AZAAD_ADMIN_SHELL__") > 1:
    raise SystemExit("Admin shell marker duplicated")

print(f"[AZAAD admin graph] PASS: {len(scripts)} unique external scripts; one shell; one pre-controller login bootstrap")
