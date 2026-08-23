from pathlib import Path
import re

ADMIN = Path("admin.html")
CANONICAL = '/admin.js?v=canonical'

if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")

# Remove the legacy inline Admin application controller. The inline block is
# identified by its canonical Supabase constants and exported AZAAD runtime.
pattern = re.compile(
    r'\s*<script\s+type=["\']module["\']\s*>.*?\n</script>\s*',
    re.I | re.S,
)

matches = []
for match in pattern.finditer(text):
    block = match.group(0)
    if (
        'const SUPABASE_URL' in block
        and 'staff-login' in block
        and 'window.AZAAD_AUTH_READY' in block
        and 'function renderDoctors' in block
    ):
        matches.append(match)

if len(matches) > 1:
    raise SystemExit(f"multiple legacy inline Admin runtimes found: {len(matches)}")

if matches:
    match = matches[0]
    text = text[:match.start()] + '\n' + text[match.end():]

# Ensure exactly one canonical external Admin application controller.
script_re = re.compile(
    r'\s*<script\s+type=["\']module["\']\s+src=["\']([^"\']*admin\.js[^"\']*)["\']\s*></script>\s*',
    re.I,
)
text = script_re.sub('', text)

marker = '<script type="module" src="/admin.js?v=canonical"></script>'
if '</head>' not in text:
    raise SystemExit("admin.html head marker not found")
text = text.replace('</head>', marker + '\n</head>', 1)

# Canonical invariant: exactly one external Admin runtime and no inline owner.
if text.count(marker) != 1:
    raise SystemExit("canonical Admin runtime reference was not established exactly once")

ADMIN.write_text(text, encoding="utf-8")
print("[AZAAD] canonical Admin runtime established: admin.js")
