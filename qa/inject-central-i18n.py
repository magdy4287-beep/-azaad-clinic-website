#!/usr/bin/env python3
"""Normalize every HTML surface to the single central I18N runtime."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = '<script src="/central-i18n.js?v=4.0.0"></script>'
changed = 0
for path in sorted(ROOT.rglob('*.html')):
    if '.git' in path.parts:
        continue
    text = path.read_text(encoding='utf-8', errors='replace')
    if SCRIPT in text or 'src="/central-i18n.js' in text or "src='/central-i18n.js" in text:
        continue
    if '</head>' not in text:
        continue
    text = text.replace('</head>', SCRIPT + '\n</head>', 1)
    path.write_text(text, encoding='utf-8')
    changed += 1
print(f'central-i18n injected into {changed} HTML surface(s)')
