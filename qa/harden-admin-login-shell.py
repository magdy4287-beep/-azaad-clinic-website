"""Harden the canonical Admin login shell against pre-module navigation and
keep non-critical synchronous head runtimes from freezing the login controls.

Authentication remains exclusively owned by admin.js. This transform only
protects the login shell; it does not validate credentials, create sessions,
or redirect.
"""
from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")

script_pattern = re.compile(
    r'\s*<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>\s*</script>\s*',
    re.I,
)

def remove_retired_guard(match):
    path = (urlsplit(match.group(1)).path or match.group(1)).lstrip('/').lower()
    return "" if path == "admin-auth-ui-guard.js" else match.group(0)

text = script_pattern.sub(remove_retired_guard, text)

# Keep the login controls native and interactive even while the module graph is
# loading. Authentication remains exclusively handled by admin.js.
form_pattern = re.compile(r'(<form\b[^>]*\bid=["\']loginForm["\'][^>]*)(>)', re.I)
match = form_pattern.search(text)
if not match:
    raise SystemExit("canonical #loginForm not found")

opening = match.group(1)
if not re.search(r'\bonsubmit\s*=', opening, re.I):
    opening = opening.rstrip() + ' onsubmit="event.preventDefault();"'
    text = text[:match.start(1)] + opening + match.group(2) + text[match.end(2):]
else:
    text = text[:match.start(1)] + re.sub(
        r'\bonsubmit\s*=\s*(["\']).*?\1',
        ' onsubmit="event.preventDefault();"',
        opening,
        count=1,
        flags=re.I | re.S,
    ) + match.group(2) + text[match.end(2):]

# The login page is already fully rendered by HTML. These two legacy/global
# runtimes are not required to make Username/Password editable. Running them
# synchronously in <head> can monopolize the main thread before admin.js has
# initialized. Defer them so the browser can paint and accept input first.
def defer_head_runtime(source_name):
    pattern = re.compile(
        r'<script\b([^>]*\bsrc=["\'](?:/)?' + re.escape(source_name) + r'(?:\?[^"\']*)?["\'][^>]*)></script>',
        re.I,
    )

    def add_defer(match):
        attrs = match.group(1)
        if re.search(r'\bdefer(?:\s*=|\b)', attrs, re.I):
            return match.group(0)
        return '<script' + attrs.rstrip() + ' defer></script>'

    return pattern.sub(add_defer, text)

text = defer_head_runtime('central-i18n.js')
text = defer_head_runtime('azaad-core-context.js')

# Fail closed: exactly one login form, no retired auth guard, and the native
# navigation guard must exist in the final production artifact.
if len(re.findall(r'<form\b[^>]*\bid=["\']loginForm["\']', text, re.I)) != 1:
    raise SystemExit("canonical login form count is not exactly one")
if 'admin-auth-ui-guard.js' in text:
    raise SystemExit("retired admin-auth-ui-guard.js remains in admin.html")
if not re.search(r'<form\b[^>]*\bid=["\']loginForm["\'][^>]*\bonsubmit=["\']event\.preventDefault\(\);["\']', text, re.I):
    raise SystemExit("login form native-navigation guard was not established")

ADMIN.write_text(text, encoding="utf-8")
print("[AZAAD] Admin login shell hardened: native navigation blocked and non-critical head runtimes deferred")
