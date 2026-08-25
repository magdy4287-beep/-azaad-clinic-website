"""Final fail-closed restoration of the canonical Admin controller reference.

All Admin transforms may rewrite or isolate script tags. This final production
transform runs immediately before verification so the build artifact has one
and only one executable reference to the canonical admin.js controller.
"""
from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
CANONICAL = "/admin.js?v=2026-08-24-login-fix"
TAG = f'<script type="module" src="{CANONICAL}"></script>'

if not ADMIN.exists():
    raise SystemExit("admin.html missing")

text = ADMIN.read_text(encoding="utf-8")
script_re = re.compile(
    r'<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>(?:\s*</script>)?\s*',
    re.I,
)

def remove_canonical_controller(match):
    src = match.group(1)
    path = (urlsplit(src).path or src).lstrip("/").lower()
    return "" if path == "admin.js" else match.group(0)

text = script_re.sub(remove_canonical_controller, text)

if "</head>" not in text:
    raise SystemExit("admin.html head marker missing")

text = text.replace("</head>", TAG + "\n</head>", 1)

count = len([
    src for src in re.findall(
        r'<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>', text, re.I
    )
    if (urlsplit(src).path or src).lstrip("/").lower() == "admin.js"
])
if count != 1 or text.count(TAG) != 1:
    raise SystemExit(
        f"Canonical admin.js restoration failed: executable reference count={count}"
    )

ADMIN.write_text(text, encoding="utf-8")
print("[AZAAD final admin controller restore] PASS: exactly one canonical admin.js reference restored immediately before verification")
