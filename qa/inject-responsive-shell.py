#!/usr/bin/env python3
"""Inject the shared responsive shell into every HTML surface at build time."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CSS = '<link rel="stylesheet" href="/azaad-responsive-shell.css?v=1.0.0">'
ROLE = '<script src="/azaad-role-experience.js?v=1.0.0" defer></script>'

for path in sorted(ROOT.rglob('*.html')):
    if '.git' in path.parts or 'node_modules' in path.parts:
        continue
    text = path.read_text(encoding='utf-8')
    original = text
    if 'azaad-responsive-shell.css' not in text:
        text = text.replace('</head>', f'{CSS}\n</head>', 1)
    if 'azaad-role-experience.js' not in text and path.name == 'admin.html':
        text = text.replace('</body>', f'{ROLE}\n</body>', 1)
    if text != original:
        path.write_text(text, encoding='utf-8')
        print(f'updated {path.relative_to(ROOT)}')
