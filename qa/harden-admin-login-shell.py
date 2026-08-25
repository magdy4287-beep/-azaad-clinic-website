"""Harden the canonical Admin login shell against pre-module form navigation.

Authentication remains exclusively owned by admin.js. This transform only
prevents the browser's native form default action before the module controller
has loaded; it does not validate credentials, create sessions, or redirect.
"""
from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")

# The retired UI guard is not an authentication owner and must not participate
# in the canonical Admin login lifecycle. Remove it from the final artifact.
script_pattern = re.compile(
    r'\s*<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>\s*</script>\s*',
    re.I,
)

def remove_retired_guard(match):
    path = (urlsplit(match.group(1)).path or match.group(1)).lstrip('/').lower()
    return "" if path == "admin-auth-ui-guard.js" else match.group(0)

text = script_pattern.sub(remove_retired_guard, text)

# Prevent a valid login-form submit from performing the browser's native GET
# navigation while admin.js is still loading. The handler is deliberately
# declarative and contains no authentication logic; admin.js remains the sole
# owner of submit processing once its module is ready.
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

# Fail closed: there must be exactly one login form and the retired guard must
# be absent from the production HTML.
if len(re.findall(r'<form\b[^>]*\bid=["\']loginForm["\']', text, re.I)) != 1:
    raise SystemExit("canonical login form count is not exactly one")
if 'admin-auth-ui-guard.js' in text:
    raise SystemExit("retired admin-auth-ui-guard.js remains in admin.html")
if not re.search(r'<form\b[^>]*\bid=["\']loginForm["\'][^>]*\bonsubmit=["\']event\.preventDefault\(\);["\']', text, re.I):
    raise SystemExit("login form native-navigation guard was not established")

ADMIN.write_text(text, encoding="utf-8")
print("[AZAAD] Admin login shell hardened: native submit navigation blocked before admin.js loads")
