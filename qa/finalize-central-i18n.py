#!/usr/bin/env python3
"""Canonicalize central i18n only on application surfaces, never isolated auth surfaces."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
I18N = '<script src="/central-i18n.js?v=6.0.0"></script>'
CORE = '<script src="/azaad-core-context.js?v=1.0.0"></script>'
LOGIN_SURFACES = {"admin-login.html"}
TAG_RE = re.compile(
    r'<script\b(?=[^>]*\bsrc\s*=\s*["\'][^"\']*(?:central-i18n|azaad-core-context)\.js(?:\?[^"\']*)?["\'])[^>]*>\s*</script\s*>',
    re.I,
)
BOOT_RE = re.compile(r'<(?:style|script)\b[^>]*(?:id=["\']azaad-i18n-(?:prepaint|bootstrap)["\'])[^>]*>.*?</(?:style|script)>\s*', re.I | re.S)

changed = 0
removed = 0
for path in sorted(ROOT.rglob('*.html')):
    if '.git' in path.parts:
        continue
    if path.name in LOGIN_SURFACES:
        continue
    text = path.read_text(encoding='utf-8', errors='replace')
    if '</head>' not in text:
        continue
    normalized, count = TAG_RE.subn('', text)
    normalized = BOOT_RE.sub('', normalized)
    normalized = normalized.replace('</head>', I18N + '\n' + CORE + '\n</head>', 1)
    if normalized != text:
        path.write_text(normalized, encoding='utf-8')
        changed += 1
        removed += count

print(f'central i18n production canonicalization: {changed} application HTML surface(s), removed {removed} prior runtime tag(s); excluded isolated login surfaces: {sorted(LOGIN_SURFACES)}')
