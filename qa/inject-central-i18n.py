#!/usr/bin/env python3
"""Normalize every HTML surface to exactly one central I18N runtime."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = '<script src="/central-i18n.js?v=4.0.0"></script>'
TAG_RE = re.compile(r'<script\b[^>]*src=["\'][^"\']*/central-i18n\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\s*', re.I)
changed = 0
for path in sorted(ROOT.rglob('*.html')):
    if '.git' in path.parts:
        continue
    text = path.read_text(encoding='utf-8', errors='replace')
    if '</head>' not in text:
        continue
    normalized, removed = TAG_RE.subn('', text)
    normalized = normalized.replace('</head>', SCRIPT + '\n</head>', 1)
    if normalized != text:
        path.write_text(normalized, encoding='utf-8')
        changed += 1
print(f'central-i18n normalized to one script tag in {changed} HTML surface(s)')
