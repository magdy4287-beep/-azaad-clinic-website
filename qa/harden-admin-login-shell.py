"""Harden the canonical Admin login shell against pre-module navigation and
keep non-critical synchronous runtimes from freezing the login controls.

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

# The login shell is already completely rendered by HTML. Global runtimes are
# not required to make Username/Password editable. Running them synchronously
# before authentication can monopolize the main thread, so defer them.
def defer_source(source_name):
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

text = defer_source('central-i18n.js')
text = defer_source('azaad-core-context.js')

# Critical hardening: every legacy/non-auth external runtime that appears in
# the document body must not execute synchronously while the login controls are
# waiting for authentication. This removes parser-blocking work from the login
# critical path without creating another controller or changing feature code.
body_match = re.search(r'<body\b[^>]*>(.*)</body>', text, re.I | re.S)
if not body_match:
    raise SystemExit("body element not found")

body = body_match.group(1)
external_script = re.compile(r'<script\b([^>]*\bsrc=["\'][^"\']+["\'][^>]*)></script>', re.I)

def defer_body_script(match):
    attrs = match.group(1)
    if re.search(r'\bdefer(?:\s*=|\b)', attrs, re.I):
        return match.group(0)
    # Modules are already deferred by specification; adding defer to ordinary
    # scripts is safe and prevents parser-blocking legacy runtimes.
    return '<script' + attrs.rstrip() + ' defer></script>'

body = external_script.sub(defer_body_script, body)
text = text[:body_match.start(1)] + body + text[body_match.end(1):]

# Fail closed: exactly one login form, no retired auth guard, native navigation
# guard, and no parser-blocking external body scripts in the final artifact.
if len(re.findall(r'<form\b[^>]*\bid=["\']loginForm["\']', text, re.I)) != 1:
    raise SystemExit("canonical login form count is not exactly one")
if 'admin-auth-ui-guard.js' in text:
    raise SystemExit("retired admin-auth-ui-guard.js remains in admin.html")
if not re.search(r'<form\b[^>]*\bid=["\']loginForm["\'][^>]*\bonsubmit=["\']event\.preventDefault\(\);["\']', text, re.I):
    raise SystemExit("login form native-navigation guard was not established")
if re.search(r'<body\b[^>]*>.*?<script\b(?![^>]*\bdefer\b)[^>]*\bsrc=', text, re.I | re.S):
    raise SystemExit("parser-blocking external body script remains on Admin login path")

ADMIN.write_text(text, encoding="utf-8")
print("[AZAAD] Admin login shell hardened: native navigation blocked and all non-critical external body runtimes deferred")