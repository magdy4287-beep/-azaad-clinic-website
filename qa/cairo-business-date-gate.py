#!/usr/bin/env python3
"""Fail closed if Admin business dates bypass the canonical Cairo context."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ADMIN = ROOT / "admin.html"
ADMIN_JS = ROOT / "admin.js"
CORE = ROOT / "azaad-core-context.js"

for path in (ADMIN, ADMIN_JS, CORE):
    if not path.is_file():
        raise SystemExit(f"Missing required Cairo date contract file: {path}")

html = ADMIN.read_text(encoding="utf-8")
js = ADMIN_JS.read_text(encoding="utf-8")
core = CORE.read_text(encoding="utf-8")

core_refs = re.findall(r'<script\b[^>]*\bsrc\s*=\s*["\'][^"\']*/azaad-core-context\.js(?:\?[^"\']*)?["\'][^>]*>', html, re.I)
if len(core_refs) != 1:
    raise SystemExit(f"Expected exactly one canonical Cairo context script in admin.html, found {len(core_refs)}")

if "todayISO" not in core or "Africa/Cairo" not in core:
    raise SystemExit("Canonical Cairo context does not expose todayISO/Africa-Cairo")

if "window.AZAAD_CORE_CONTEXT?.todayISO" not in js:
    raise SystemExit("Admin todayISO is not delegated to AZAAD_CORE_CONTEXT.todayISO")

local_today = re.search(
    r"function\s+todayISO\s*\(\s*\)\s*\{[^}]*getFullYear\s*\(\)[^}]*getMonth\s*\(\)[^}]*getDate\s*\(\)",
    js,
    re.S,
)
if local_today:
    raise SystemExit("Admin still contains a browser-local todayISO implementation")

print("[AZAAD] Cairo business-date gate passed: one core context, canonical todayISO delegation, no local Admin date implementation")
