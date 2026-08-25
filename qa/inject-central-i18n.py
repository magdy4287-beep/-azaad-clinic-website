#!/usr/bin/env python3
"""Normalize central I18N only on application surfaces."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = '<script src="/central-i18n.js?v=4.0.0"></script>'
LOGIN_SURFACES = {"admin-login.html", "admin-auth.html"}
TAG_RE = re.compile(
    r'<script\b[^>]*\bsrc\s*=\s*["\'][^"\']*/central-i18n\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script\s*>',
    re.I,
)
changed = 0
removed_tags = 0
for path in sorted(ROOT.rglob('*.html')):
    if '.git' in path.parts:
        continue
    if path.name in LOGIN_SURFACES:
        continue
    text = path.read_text(encoding='utf-8', errors='replace')
    if '</head>' not in text:
        continue
    normalized, removed = TAG_RE.subn('', text)
    normalized = normalized.replace('</head>', SCRIPT + '\n</head>', 1)
    if normalized != text:
        path.write_text(normalized, encoding='utf-8')
        changed += 1
        removed_tags += removed
print(f'central-i18n normalized to one application script tag in {changed} HTML surface(s); removed {removed_tags} prior tag(s); excluded isolated auth surfaces: {sorted(LOGIN_SURFACES)}')
