#!/usr/bin/env python3
"""Fail-closed guard: no legacy admin i18n runtime may be emitted.

The Admin surface may use admin-business-hardening.js for non-i18n helpers,
while central-i18n.js is the only runtime locale owner.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = [ROOT / "admin.html"]
FORBIDDEN = (
    "admin-nextgen-fixes.js",
    "admin-nextgen-v2.js",
    "admin-english-hardening.js",
    "AZAAD_ADMIN_I18N",
    "AZAAD_ADMIN_ENGLISH_HARDENING",
)

for path in HTML_FILES:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    hits = [token for token in FORBIDDEN if token in text]
    if hits:
        print(f"FAIL: legacy admin i18n runtime references in {path}: {hits}")
        sys.exit(1)

print("PASS: Central i18n is the only Admin runtime locale owner")
