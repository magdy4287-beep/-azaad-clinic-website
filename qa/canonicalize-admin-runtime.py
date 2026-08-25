from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
CANONICAL = '/admin.js?v=2026-08-24-login-fix'

if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")

# Remove any legacy inline Admin controller regardless of whether it was marked
# type=module. The previous detector only handled module scripts, leaving the
# real plain inline controller alive and competing with /admin.js.
INLINE_SCRIPT = re.compile(
    r'<script\b([^>]*)>(.*?)</script>',
    re.I | re.S,
)
LEGACY_MARKERS = (
    'const SUPABASE_URL',
    'STAFF_LOGIN_FUNCTION',
    'function login',
    'clinic_staff',
)

def strip_legacy_inline(match):
    attrs, body = match.group(1), match.group(2)
    if re.search(r'\bsrc\s*=', attrs, re.I):
        return match.group(0)
    if sum(marker in body for marker in LEGACY_MARKERS) >= 3:
        return '\n'
    return match.group(0)

text = INLINE_SCRIPT.sub(strip_legacy_inline, text)

# Remove every previous Admin controller/bootstrap reference and establish exactly
# one external controller. No frozen login page, no redirect bootstrap.
EXTERNAL_SCRIPT_TAG = re.compile(
    r'<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>(?:\s*</script>)?',
    re.I,
)

def is_admin_auth_surface(src):
    path = (urlsplit(src).path or src).lstrip('/').lower()
    return path in {
        'admin.js',
        'admin-login-bootstrap.js',
    }

text = EXTERNAL_SCRIPT_TAG.sub(
    lambda m: '' if is_admin_auth_surface(m.group(1)) else m.group(0),
    text,
)

# Remove any prior login isolation styles/guards.
text = re.sub(
    r'\s*<style id=["\']azaad-admin-login-surface["\']>.*?</style>\s*',
    '\n', text, flags=re.I | re.S,
)
text = re.sub(
    r'\s*<script id=["\']AZAAD_ADMIN_AUTH_ISOLATION_V[0-9]+["\']>.*?</script>\s*',
    '\n', text, flags=re.I | re.S,
)

# Remove duplicate external scripts by URL path while preserving the first copy.
seen = set()
def dedupe(match):
    src = match.group(1)
    path = (urlsplit(src).path or src).lstrip('/').lower()
    if path in seen:
        return ''
    seen.add(path)
    return match.group(0)
text = EXTERNAL_SCRIPT_TAG.sub(dedupe, text)

marker = f'<script type="module" src="{CANONICAL}"></script>'
text = text.replace(marker, '')
if '</head>' not in text:
    raise SystemExit("admin.html head marker not found")
text = text.replace('</head>', marker + '\n</head>', 1)

if text.count(marker) != 1:
    raise SystemExit("canonical admin.js reference was not established exactly once")

# Hard fail if a second login controller survived.
remaining_legacy = []
for match in INLINE_SCRIPT.finditer(text):
    attrs, body = match.group(1), match.group(2)
    if re.search(r'\bsrc\s*=', attrs, re.I):
        continue
    if sum(marker_text in body for marker_text in LEGACY_MARKERS) >= 3:
        remaining_legacy.append(match)
if remaining_legacy:
    raise SystemExit("legacy inline Admin login/controller remains after canonicalization")

if 'admin-login-bootstrap.js' in text or 'AZAAD_ADMIN_AUTH_ISOLATION_V' in text:
    raise SystemExit("legacy frozen Admin login surface remains in admin.html")

ADMIN.write_text(text, encoding="utf-8")
print("[AZAAD] admin.html is now the single canonical Admin authentication owner")
