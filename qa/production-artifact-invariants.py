#!/usr/bin/env python3
"""Fail-closed invariants for the final static production artifact."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
I18N_RE = re.compile(
    r'<script\b(?=[^>]*\bsrc\s*=\s*["\'][^"\']*(?:/|^)central-i18n\.js(?:\?[^"\']*)?["\'])[^>]*>\s*</script\s*>',
    re.I,
)
SCRIPT_SRC_RE = re.compile(
    r'<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\'][^>]*>\s*</script\s*>',
    re.I,
)

html_files = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts)
failures = []
checked = 0

for path in html_files:
    text = path.read_text(encoding="utf-8", errors="replace")
    if "</head>" not in text:
        continue
    checked += 1

    i18n_count = len(I18N_RE.findall(text))
    if i18n_count != 1:
        failures.append(f"{path}: central-i18n.js count={i18n_count}, expected exactly 1")

    sources = [src for src in SCRIPT_SRC_RE.findall(text) if not src.startswith(("data:", "blob:"))]
    duplicates = sorted({src for src in sources if sources.count(src) > 1})
    for src in duplicates:
        failures.append(f"{path}: duplicate script source={src}")

if failures:
    print("Production artifact invariants: FAIL")
    for failure in failures:
        print(f" - {failure}")
    raise SystemExit(1)

print(f"Production artifact invariants: PASS ({checked} HTML surfaces checked)")
print("central-i18n: exactly one runtime per HTML surface")
print("script sources: no duplicate external script execution per HTML surface")
