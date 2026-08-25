from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")

# Final pass: this is intentionally the last Admin HTML mutation in the build.
# Every external runtime except the canonical admin.js is inert until auth.
script_open = re.compile(r"<script\b([^>]*)>", re.I | re.S)
src_attr = re.compile(r"\bsrc\s*=\s*(?:([\"'])(.*?)\1|([^\s>]+))", re.I | re.S)
type_module = re.compile(r"\btype\s*=\s*([\"'])module\1", re.I)

def isolate(match):
    attrs = match.group(1)
    found = src_attr.search(attrs)
    if not found:
        return match.group(0)
    src = found.group(2) if found.group(2) is not None else found.group(3)
    path = (urlsplit(src).path or src).lstrip("/").lower()
    if path == "admin.js":
        return match.group(0)
    if path == "central-i18n.js":
        without_defer = re.sub(r"\bdefer(?:\s*=\s*(?:[\"'])?[^\s>\"']*(?:[\"'])?)?", "", attrs, flags=re.I)
        return "<script" + without_defer.rstrip() + " defer>"
    module_attr = ' data-azaad-after-auth-type="module"' if type_module.search(attrs) else ''
    remainder = (attrs[:found.start()] + attrs[found.end():]).strip()
    return f'<script data-azaad-after-auth-src="{src}"{module_attr}{(" " + remainder) if remainder else ""}>'

text = script_open.sub(isolate, text)

# Protect the login surface even before admin.js executes. This is not an auth
# controller; it only prevents native form navigation from destroying the form.
form_pattern = re.compile(r'(<form\b[^>]*\bid=[\"\']loginForm[\"\'][^>]*)(>)', re.I)
form = form_pattern.search(text)
if not form:
    raise SystemExit("Canonical login form not found")
opening = form.group(1)
if not re.search(r"\bonsubmit\s*=", opening, re.I):
    opening = opening.rstrip() + ' onsubmit="event.preventDefault();"'
else:
    opening = re.sub(r'\bonsubmit\s*=\s*([\"\']).*?\1', ' onsubmit="event.preventDefault();"', opening, count=1, flags=re.I | re.S)
text = text[:form.start(1)] + opening + form.group(2) + text[form.end(2):]

# The legacy inline controller must be absent regardless of script type.
inline = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.I | re.S)
legacy_markers = ("const SUPABASE_URL", "STAFF_LOGIN_FUNCTION", "function login", "clinic_staff")
for match in inline.finditer(text):
    attrs, body = match.group(1), match.group(2)
    if not re.search(r"\bsrc\s*=", attrs, re.I) and sum(marker in body for marker in legacy_markers) >= 3:
        raise SystemExit("Legacy inline Admin Login controller remains")

if len(re.findall(r'<form\b[^>]*\bid=[\"\']loginForm[\"\']', text, re.I)) != 1:
    raise SystemExit("Admin Login form count is not exactly one")

executable = []
for match in script_open.finditer(text):
    attrs = match.group(1)
    found = src_attr.search(attrs)
    if not found:
        continue
    src = found.group(2) if found.group(2) is not None else found.group(3)
    path = (urlsplit(src).path or src).lstrip("/").lower()
    if path not in {"admin.js", "central-i18n.js"}:
        executable.append(src)

if executable:
    raise SystemExit("Non-canonical Admin runtimes remain executable: " + ", ".join(executable))

if text.count('data-azaad-after-auth-src=') < 1:
    raise SystemExit("No post-auth runtime manifest was produced")

ADMIN.write_text(text, encoding="utf-8")
print("[AZAAD final admin isolation] PASS: only admin.js + deferred central-i18n remain executable before authentication")
