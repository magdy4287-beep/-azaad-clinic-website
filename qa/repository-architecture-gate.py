from pathlib import Path
import re
import sys

ROOT = Path('.')
ADMIN = ROOT / 'admin.html'
PATCH = ROOT / '.github' / 'patch-admin.py'
BUILD = ROOT / 'qa' / 'vercel-build.py'

errors = []

if not ADMIN.exists():
    errors.append('missing admin.html')
if not PATCH.exists():
    errors.append('missing .github/patch-admin.py')
if not BUILD.exists():
    errors.append('missing qa/vercel-build.py')

if ADMIN.exists():
    text = ADMIN.read_text(encoding='utf-8', errors='replace')
    # The shell is the only runtime recovery/controller layer.
    if text.count('admin-shell.js') > 1:
        errors.append('admin-shell.js is injected more than once')
    for retired in ('admin-ui-failsafe.js', 'admin-login-controller.js'):
        if retired in text:
            errors.append(f'retired competing Admin controller present in admin.html: {retired}')

if PATCH.exists():
    text = PATCH.read_text(encoding='utf-8', errors='replace')
    # Build composition must be explicit and idempotent.
    if 'inject_head_script("admin.html","/admin-shell.js?v=1")' not in text:
        errors.append('Admin Shell is not the canonical head injection')
    for retired in ('admin-ui-failsafe.js', 'admin-login-controller.js'):
        if retired in text:
            errors.append(f'retired competing Admin controller injected by patch-admin.py: {retired}')

if BUILD.exists():
    text = BUILD.read_text(encoding='utf-8', errors='replace')
    if 'repository-architecture-gate.py' not in text:
        errors.append('production build does not run repository architecture gate')

# No duplicate literal external script URLs in the source HTML.
if ADMIN.exists():
    text = ADMIN.read_text(encoding='utf-8', errors='replace')
    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', text)
    normalized = {}
    for src in scripts:
        key = src.split('?', 1)[0]
        normalized.setdefault(key, 0)
        normalized[key] += 1
    duplicates = sorted(k for k, v in normalized.items() if v > 1 and k)
    if duplicates:
        errors.append('duplicate script sources in admin.html: ' + ', '.join(duplicates))

if errors:
    print('[AZAAD architecture gate] FAIL')
    for error in errors:
        print(' - ' + error)
    sys.exit(1)

print('[AZAAD architecture gate] PASS')
