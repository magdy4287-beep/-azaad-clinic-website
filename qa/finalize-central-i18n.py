#!/usr/bin/env python3
"""Final, path-agnostic central-i18n canonicalization for the production artifact."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = '<script src="/central-i18n.js?v=4.0.0"></script>'

# Match both absolute-root and relative central-i18n script URLs, regardless of
# query string, attribute ordering, defer/async, whitespace, or quote style.
TAG_RE = re.compile(
    r'<script\b[^>]*\bsrc\s*=\s*["\'][^"\']*(?:^|/)central-i18n\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script\s*>',
    re.I,
)
# The previous expression cannot use ^ inside the character-scanning portion
# as a URL-path boundary, so keep a second, simpler matcher for all URL forms.
TAG_RE = re.compile(
    r'<script\b(?=[^>]*\bsrc\s*=\s*["\'][^"\']*central-i18n\.js(?:\?[^"\']*)?["\'])[^>]*>\s*</script\s*>',
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
    normalized = normalized.replace('</head>', CANONICAL + '\n</head>', 1)
    if normalized != text:
        path.write_text(normalized, encoding='utf-8')
        changed += 1
        removed += count

print(f'final central-i18n canonicalization: {changed} HTML surface(s), removed {removed} prior runtime tag(s)')
