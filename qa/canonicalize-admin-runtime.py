from pathlib import Path
import re

ADMIN = Path("admin.html")
CANONICAL = '/admin.js?v=2026-08-24-login-fix'
LOGIN_BOOTSTRAP = '/admin-login-bootstrap.js?v=3'

if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")

INLINE_MODULE = re.compile(
    r'\s*<script\b[^>]*\btype\s*=\s*["\']module["\'][^>]*>.*?</script>\s*',
    re.I | re.S,
)

legacy_matches = []
for match in INLINE_MODULE.finditer(text):
    block = match.group(0)
    stable_markers = (
        'const SUPABASE_URL', 'staff-login', 'function restoreStaff',
        'function renderDoctors', 'function renderServices', 'function load()',
    )
    if sum(marker in block for marker in stable_markers) >= 4:
        legacy_matches.append(match)

if len(legacy_matches) > 1:
    raise SystemExit(f"multiple legacy inline Admin runtimes found: {len(legacy_matches)}")

if legacy_matches:
    match = legacy_matches[0]
    text = text[:match.start()] + '\n' + text[match.end():]

# Match the exact basename admin.js. This must never match doctor-services-admin.js.
ADMIN_SCRIPT_TAG = re.compile(
    r'<script\b[^>]*\bsrc\s*=\s*["\'][^"\']*(?:^|[/._])admin\.js(?:\?[^"\']*)?["\'][^>]*>(?:\s*</script>)?',
    re.I | re.S,
)
BOOTSTRAP_SCRIPT_TAG = re.compile(
    r'<script\b[^>]*\bsrc\s*=\s*["\'][^"\']*admin-login-bootstrap\.js(?:\?[^"\']*)?["\'][^>]*>(?:\s*</script>)?',
    re.I | re.S,
)
text = ADMIN_SCRIPT_TAG.sub('', text)
text = BOOTSTRAP_SCRIPT_TAG.sub('', text)

marker = f'<script type="module" src="{CANONICAL}"></script>'
bootstrap_marker = f'<script src="{LOGIN_BOOTSTRAP}" defer></script>'
text = text.replace(marker, '')
text = text.replace(bootstrap_marker, '')
if '</head>' not in text:
    raise SystemExit("admin.html head marker not found")
text = text.replace('</head>', bootstrap_marker + '\n' + marker + '\n</head>', 1)

LOGIN_SURFACE_STYLE = '''<style id="azaad-admin-login-surface">
#loginPage{position:relative;z-index:1000;pointer-events:auto!important}
#loginPage .login-card{position:relative;z-index:1001;pointer-events:auto!important}
#loginPage form,#loginPage label,#loginPage input,#loginPage button{position:relative;z-index:1002;pointer-events:auto!important}
#loginPage input{user-select:text!important;-webkit-user-select:text!important;cursor:text!important}
#loginPage button{cursor:pointer!important}
</style>'''

text = re.sub(r'\s*<style id="azaad-admin-login-surface">.*?</style>\s*', '\n', text, flags=re.I | re.S)
text = text.replace('</head>', LOGIN_SURFACE_STYLE + '\n</head>', 1)

for element_id in ('username', 'password'):
    text = re.sub(
        rf'(<input\b(?=[^>]*\bid\s*=\s*["\']{element_id}["\']))([^>]*)(>)',
        lambda match: re.sub(
            r'\s+(?:disabled|readonly|inert)(?:\s*=\s*(?:["\'][^"\']*["\']|[^\s>]+))?',
            '', match.group(0), flags=re.I,
        ),
        text, flags=re.I | re.S,
    )

if text.count(marker) != 1:
    raise SystemExit("canonical Admin runtime reference was not established exactly once")
if text.count(bootstrap_marker) != 1:
    raise SystemExit("Admin login bootstrap reference was not established exactly once")

remaining_inline = []
for match in INLINE_MODULE.finditer(text):
    block = match.group(0)
    if sum(marker_text in block for marker_text in (
        'const SUPABASE_URL', 'staff-login', 'function restoreStaff',
        'function renderDoctors', 'function renderServices',
    )) >= 3:
        remaining_inline.append(match)
if remaining_inline:
    raise SystemExit("legacy inline Admin runtime remains after canonicalization")

ADMIN.write_text(text, encoding="utf-8")
print("[AZAAD] canonical Admin runtime + versioned login bootstrap v3 + interactive login surface established")
