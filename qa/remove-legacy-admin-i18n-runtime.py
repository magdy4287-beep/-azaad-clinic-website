#!/usr/bin/env python3
"""Remove the legacy admin-only i18n runtime from the production artifact.

The checked-in legacy generator may remain for historical compatibility, but
Production must expose exactly one runtime locale owner: central-i18n.js.
"""
from pathlib import Path
import re

path = Path("admin.html")
text = path.read_text(encoding="utf-8", errors="replace")

# finalize-auth.py historically appended a second <script> containing
# `const AZAAD_I18N = ...`, its own language toggle, and a MutationObserver.
# Remove only that generated runtime block; do not touch unrelated scripts.
pattern = re.compile(
    r'<script\b[^>]*>\s*const\s+AZAAD_I18N\s*=.*?</script>\s*',
    re.I | re.S,
)
normalized, removed = pattern.subn("\n", text, count=1)

# Also remove the generated legacy language-toggle marker if a previous build
# left only the DOM node behind. The canonical central runtime owns controls.
normalized = re.sub(
    r'<button\b[^>]*\bid=["\']azaadLanguageToggle["\'][^>]*>.*?</button>\s*',
    "",
    normalized,
    count=1,
    flags=re.I | re.S,
)

path.write_text(normalized, encoding="utf-8")
print(f"legacy admin i18n runtime removed: {removed} block(s)")
