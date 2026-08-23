from pathlib import Path
import re

ADMIN = Path("admin.html")
CANONICAL = '/admin.js?v=canonical'

if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")

# The legacy Admin controller was historically embedded as a large inline
# module. Its exact helper names changed over time, so matching one optional
# readiness marker is unsafe: a changed legacy block could survive and compete
# with admin.js. Identify the runtime by its stable ownership signature instead.
INLINE_MODULE = re.compile(
    r'\s*<script\s+type=["\']module["\']\s*>.*?</script>\s*',
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

# Remove every external admin.js reference and install exactly one canonical
# application owner. Query strings are ignored when matching old references.
SCRIPT_RE = re.compile(
    r'\s*<script\s+[^>]*src=["\']([^"\']*admin\.js[^"\']*)["\'][^>]*>\s*</script>\s*',
    re.I,
)
text = SCRIPT_RE.sub('', text)

marker = '<script type="module" src="/admin.js?v=canonical"></script>'
if '</head>' not in text:
    raise SystemExit("admin.html head marker not found")
text = text.replace('</head>', marker + '\n</head>', 1)

# Fail closed: exactly one canonical external owner and no legacy inline owner.
if text.count(marker) != 1:
    raise SystemExit("canonical Admin runtime reference was not established exactly once")

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
print("[AZAAD] canonical Admin runtime established: admin.js")
