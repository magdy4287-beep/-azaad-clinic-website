from pathlib import Path
import re

ADMIN = Path("admin.html")
CANONICAL = '/admin.js?v=canonical'
LOGIN_BOOTSTRAP = '/admin-login-bootstrap.js?v=1'

if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")

# The legacy Admin controller was historically embedded as a large inline
# module. Its exact helper names changed over time, so matching one optional
# readiness marker is unsafe: a changed legacy block could survive and compete
# with admin.js. Identify the runtime by its stable ownership signature instead.
INLINE_MODULE = re.compile(
    r'\s*<script\b[^>]*\btype\s*=\s*["\']module["\'][^>]*>.*?</script>\s*',
    re.I | re.S,
)

legacy_matches = []
for match in INLINE_MODULE.finditer(text):
    block = match.group(0)
    stable_markers = (
        'const SUPABASE_URL',
        'staff-login',
        'function restoreStaff',
        'function renderDoctors',
        'function renderServices',
        'function load()',
    )
    marker_count = sum(marker in block for marker in stable_markers)
    if marker_count >= 4:
        legacy_matches.append(match)

if len(legacy_matches) > 1:
    raise SystemExit(
        f"multiple legacy inline Admin runtimes found: {len(legacy_matches)}"
    )

if legacy_matches:
    match = legacy_matches[0]
    text = text[:match.start()] + '\n' + text[match.end():]

# Remove every external admin.js reference, including variants with whitespace
# around src=, arbitrary attribute order, query strings, defer, or module type.
# The canonical owner is installed exactly once below.
SCRIPT_RE = re.compile(
    r'\s*<script\b[^>]*\bsrc\s*=\s*["\'][^"\']*admin\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\s*',
    re.I,
)
text = SCRIPT_RE.sub('', text)

BOOTSTRAP_RE = re.compile(
    r'\s*<script\b[^>]*\bsrc\s*=\s*["\'][^"\']*admin-login-bootstrap\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\s*',
    re.I,
)
text = BOOTSTRAP_RE.sub('', text)

marker = '<script type="module" src="/admin.js?v=canonical"></script>'
bootstrap_marker = '<script src="/admin-login-bootstrap.js?v=1" defer></script>'
if '</head>' not in text:
    raise SystemExit("admin.html head marker not found")
text = text.replace('</head>', bootstrap_marker + '\n' + marker + '\n</head>', 1)

# The login surface is a hard security boundary: it must remain interactive
# before authentication. Normalize only the login controls and remove stale
# DOM state that could make the password field untargetable after a previous
# runtime/overlay. This does not alter authentication or authorization.
LOGIN_SURFACE_STYLE = '''<style id="azaad-admin-login-surface">
#loginPage{position:relative;z-index:1000;pointer-events:auto!important}
#loginPage .login-card{position:relative;z-index:1001;pointer-events:auto!important}
#loginPage form,#loginPage label,#loginPage input,#loginPage button{position:relative;z-index:1002;pointer-events:auto!important}
#loginPage input{user-select:text!important;-webkit-user-select:text!important;cursor:text!important}
#loginPage button{cursor:pointer!important}
</style>'''

text = re.sub(
    r'\s*<style id="azaad-admin-login-surface">.*?</style>\s*',
    '\n',
    text,
    flags=re.I | re.S,
)
text = text.replace('</head>', LOGIN_SURFACE_STYLE + '\n</head>', 1)

# Remove stale interaction-lock attributes from the two actual login inputs.
for element_id in ('username', 'password'):
    text = re.sub(
        rf'(<input\b(?=[^>]*\bid\s*=\s*["\']{element_id}["\']))([^>]*)(>)',
        lambda match: re.sub(
            r'\s+(?:disabled|readonly|inert)(?:\s*=\s*(?:["\'][^"\']*["\']|[^\s>]+))?',
            '',
            match.group(0),
            flags=re.I,
        ),
        text,
        flags=re.I | re.S,
    )

# Fail closed: exactly one canonical external owner and no legacy inline owner.
if text.count(marker) != 1:
    raise SystemExit("canonical Admin runtime reference was not established exactly once")
if text.count(bootstrap_marker) != 1:
    raise SystemExit("Admin login bootstrap reference was not established exactly once")

remaining_inline = []
for match in INLINE_MODULE.finditer(text):
    block = match.group(0)
    marker_count = sum(
        marker_text in block
        for marker_text in (
            'const SUPABASE_URL',
            'staff-login',
            'function restoreStaff',
            'function renderDoctors',
            'function renderServices',
        )
    )
    if marker_count >= 3:
        remaining_inline.append(match)

if remaining_inline:
    raise SystemExit("legacy inline Admin runtime remains after canonicalization")

ADMIN.write_text(text, encoding="utf-8")
print("[AZAAD] canonical Admin runtime + dependency-free login bootstrap + interactive login surface established")