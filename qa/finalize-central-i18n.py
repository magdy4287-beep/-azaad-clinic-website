#!/usr/bin/env python3
"""Final, path-agnostic canonicalization for the production artifact."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
I18N = '<script src="/central-i18n.js?v=5.0.0"></script>'
CORE = '<script src="/azaad-core-context.js?v=1.0.0"></script>'

TAG_RE = re.compile(
    r'<script\b(?=[^>]*\bsrc\s*=\s*["\'][^"\']*(?:central-i18n|azaad-core-context)\.js(?:\?[^"\']*)?["\'])[^>]*>\s*</script\s*>',
    re.I,
)

changed = 0
removed = 0
for path in sorted(ROOT.rglob('*.html')):
    if '.git' in path.parts:
        continue
    text = path.read_text(encoding='utf-8', errors='replace')
    if '</head>' not in text:
        continue
    normalized, count = TAG_RE.subn('', text)
    normalized = normalized.replace('</head>', I18N + '\n' + CORE + '\n</head>', 1)
    if normalized != text:
        path.write_text(normalized, encoding='utf-8')
        changed += 1
        removed += count

print(f'final centralized runtime canonicalization: {changed} HTML surface(s), removed {removed} prior runtime tag(s)')
