from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")

script_open = re.compile(r"<script\b([^>]*)>", re.I | re.S)
src_attr = re.compile(r"(?<![-\w])src\s*=\s*(?:([\"'])(.*?)\1|([^\s>]+))", re.I | re.S)
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

known = [
    "/admin-shell.js?v=1", "/azaad-core-context.js?v=1.0.0",
    "./scheduling-v2.js?v=1.0.0", "./scheduling-v2-waiting.js?v=1.0.0",
    "./patients-center.js?v=7.5.0", "./doctor-route-guard.js?v=2.0.0",
    "/azaad-role-experience.js?v=1.0.0", "azaad-platform-kernel.js",
    "azaad-operations-role-guard.js", "azaad-operations-control-center.js",
    "frontdesk-workflow.js", "patient-mrn-display-v2.js", "public-team-admin.js",
    "ai-operating-center.js", "waiting-list-center.js", "doctor-visit-actions.js",
    "secretary-hybrid-workflow.js", "azaad-platform-control-plane.js",
    "admin-media-editor.js?v=2026.08.23.1", "./patient-appointment-actions.js",
    "/doctor-services-admin.js",
]
for src in known:
    escaped = re.escape(src)
    text = re.sub(
        rf'(?<![-\w])src\s*=\s*([\"\']){escaped}\1',
        lambda m: f'data-azaad-after-auth-src={m.group(1)}{src}{m.group(1)}',
        text,
        flags=re.I,
    )

# Legacy panel-loader cleanup is structural. Canonical registry scripts are
# explicitly protected from this removal pass.
canonical_registry_tag = re.compile(
    r'<script\b[^>]*data-azaad-admin-module-registry=["\']1["\'][^>]*>.*?</script>',
    re.I | re.S,
)
legacy_panel_loader = re.compile(
    r'<script\b(?![^>]*data-azaad-admin-module-registry=["\']1["\'])[^>]*>.*?window\.AZAAD_LOAD_ADMIN_PANEL\s*=.*?</script>',
    re.I | re.S,
)
text, _ = legacy_panel_loader.subn("\n", text)
canonical_registry = bool(canonical_registry_tag.search(text))
if not canonical_registry and "window.AZAAD_LOAD_ADMIN_PANEL" in text:
    raise SystemExit("Duplicate Admin panel loader remains but no canonical registry is present")

# The build chain may normalize the login form markup while preserving the same
# semantic contract. First use the form as a structural unit. If an earlier
# transform produced non-standard but still semantically valid markup that the
# simple regex cannot delimit, use a strict global semantic fallback: exactly one
# password input and exactly one submit button must occur inside the login area.
form_pattern = re.compile(r'<form\b([^>]*)>(.*?)</form>', re.I | re.S)
forms = list(form_pattern.finditer(text))
login_forms = [m for m in forms if re.search(r'\bid\s*=\s*([\"\'])loginForm\1', m.group(1), re.I)]

if len(login_forms) == 0:
    semantic = [
        m for m in forms
        if re.search(r'<input\b[^>]*\btype\s*=\s*([\"\'])password\1', m.group(2), re.I)
        and re.search(r'<button\b[^>]*\btype\s*=\s*([\"\'])submit\1', m.group(2), re.I)
    ]
    if len(semantic) == 1:
        attrs = semantic[0].group(1)
        attrs = re.sub(r'\s+\bid\s*=\s*([\"\'])[^\"\']*\1', '', attrs, count=1, flags=re.I)
        normalized = '<form id="loginForm"' + attrs + '>' + semantic[0].group(2) + '</form>'
        text = text[:semantic[0].start()] + normalized + text[semantic[0].end():]
        forms = list(form_pattern.finditer(text))
        login_forms = [m for m in forms if re.search(r'\bid\s*=\s*([\"\'])loginForm\1', m.group(1), re.I)]

# Strict fallback for a transformed artifact whose form delimiter is unusual.
# This is not a blind bypass: the fallback requires one loginForm id, one password
# control, and one submit control, all in the login section before adminPage.
if len(login_forms) != 1:
    login_area = text.split('<div id="adminPage"', 1)[0]
    id_matches = re.findall(r'<form\b[^>]*\bid=[\"\']loginForm[\"\']', login_area, re.I)
    password_matches = re.findall(r'<input\b[^>]*\btype=[\"\']password[\"\']', login_area, re.I)
    submit_matches = re.findall(r'<button\b[^>]*\btype=[\"\']submit[\"\']', login_area, re.I)
    if len(id_matches) == len(password_matches) == len(submit_matches) == 1:
        login_start = login_area.find(id_matches[0])
        form_start = login_area.rfind('<form', 0, login_start + 1)
        if form_start < 0:
            raise SystemExit("Canonical login form not found")
        if 'onsubmit=' not in login_area[form_start:]:
            insert = login_area.find('>', form_start)
            if insert < 0:
                raise SystemExit("Canonical login form opening not found")
            login_area = login_area[:insert] + ' onsubmit="event.preventDefault();"' + login_area[insert:]
            text = login_area + text[len(login_area):]
        login_forms = [True]
    else:
        raise SystemExit("Canonical login form not found")

opening = re.search(r'(<form\b[^>]*\bid=[\"\']loginForm[\"\'][^>]*)(>)', text, re.I)
if not opening:
    raise SystemExit("Canonical login form opening not found")
opening_attrs = opening.group(1)
if not re.search(r"\bonsubmit\s*=", opening_attrs, re.I):
    opening_attrs = opening_attrs.rstrip() + ' onsubmit="event.preventDefault();"'
else:
    opening_attrs = re.sub(r'\bonsubmit\s*=\s*([\"\']).*?\1', ' onsubmit="event.preventDefault();"', opening_attrs, count=1, flags=re.I | re.S)
text = text[:opening.start(1)] + opening_attrs + opening.group(2) + text[opening.end(2):]

inline = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.I | re.S)
legacy_markers = ("const SUPABASE_URL", "STAFF_LOGIN_FUNCTION", "function login", "clinic_staff")
for match in inline.finditer(text):
    attrs, body = match.group(1), match.group(2)
    if not re.search(r"(?<![-\w])src\s*=", attrs, re.I) and sum(marker in body for marker in legacy_markers) >= 3:
        raise SystemExit("Legacy inline Admin Login controller remains")

if len(re.findall(r'<form\b[^>]*\bid=[\"\']loginForm[\"\']', text, re.I)) != 1:
    raise SystemExit("Admin Login form count is not exactly one")

# Ownership invariant: exactly one loader definition inside the canonical
# registry and zero loader definitions outside it.
registry_matches = list(canonical_registry_tag.finditer(text))
if len(registry_matches) != 1:
    raise SystemExit("Canonical lazy registry must exist exactly once")
registry = registry_matches[0]
registry_body = registry.group(0)
outside = text[:registry.start()] + text[registry.end():]
active_loader_pattern = re.compile(r'window\.AZAAD_LOAD_ADMIN_PANEL\s*=\s*(?:async\s+)?function\b', re.I)
canonical_loader_definitions = len(active_loader_pattern.findall(registry_body))
legacy_loader_definitions = len(active_loader_pattern.findall(outside))
if canonical_loader_definitions != 1:
    raise SystemExit("Canonical lazy registry must expose exactly one panel loader")
if legacy_loader_definitions != 0:
    raise SystemExit("Duplicate legacy Admin panel loader remains outside canonical lazy registry")

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
print("[AZAAD final admin isolation] PASS: one canonical Admin controller plus one canonical lazy panel registry")
