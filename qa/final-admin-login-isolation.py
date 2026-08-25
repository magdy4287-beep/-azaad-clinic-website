from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")
FORM_RE = re.compile(r"<form\b([^>]*)>(.*?)</form>", re.I | re.S)
LOGIN_RE = re.compile(r'\bid\s*=\s*(["\'])loginForm\1', re.I)
ADMIN_PAGE_RE = re.compile(r'<(?:div|section|main)\b[^>]*\bid\s*=\s*(["\'])adminPage\1[^>]*>', re.I)

forms_before = list(FORM_RE.finditer(text))
login_forms_before = [m for m in forms_before if LOGIN_RE.search(m.group(1))]
if len(login_forms_before) != 1:
    semantic_before = [
        m for m in forms_before
        if re.search(r'<input\b[^>]*\btype\s*=\s*(["\'])password\1', m.group(2), re.I)
        and re.search(r'<button\b[^>]*\btype\s*=\s*(["\'])submit\1', m.group(2), re.I)
    ]
    if len(semantic_before) != 1:
        raise SystemExit("Canonical login form not found before isolation")
    attrs = re.sub(r'\s+\bid\s*=\s*(["\'])[^"\']*\1', '', semantic_before[0].group(1), count=1, flags=re.I)
    normalized = '<form id="loginForm"' + attrs + '>' + semantic_before[0].group(2) + '</form>'
    text = text[:semantic_before[0].start()] + normalized + text[semantic_before[0].end():]
    forms_before = list(FORM_RE.finditer(text))
    login_forms_before = [m for m in forms_before if LOGIN_RE.search(m.group(1))]
if len(login_forms_before) != 1:
    raise SystemExit("Admin login form count is not exactly one before isolation")
canonical_login_form = login_forms_before[0].group(0)

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
        rf'(?<![-\w])src\s*=\s*(["\']){escaped}\1',
        lambda m: f'data-azaad-after-auth-src={m.group(1)}{src}{m.group(1)}',
        text,
        flags=re.I,
    )

legacy_panel_loader = re.compile(
    r'<script\b(?![^>]*data-azaad-admin-module-registry=["\']1["\'])[^>]*>.*?window\.AZAAD_LOAD_ADMIN_PANEL\s*=.*?</script>',
    re.I | re.S,
)
text, _ = legacy_panel_loader.subn("\n", text)

forms_after = list(FORM_RE.finditer(text))
login_forms = [m for m in forms_after if LOGIN_RE.search(m.group(1))]
if len(login_forms) == 0:
    marker_match = ADMIN_PAGE_RE.search(text)
    if not marker_match:
        body_end = re.search(r'</body\s*>', text, re.I)
        if not body_end:
            raise SystemExit("Admin shell marker and body boundary are both missing while restoring login form")
        insert_at = body_end.start()
    else:
        insert_at = marker_match.start()
    text = text[:insert_at] + canonical_login_form + "\n\n" + text[insert_at:]
    login_forms = [m for m in FORM_RE.finditer(text) if LOGIN_RE.search(m.group(1))]
if len(login_forms) != 1:
    raise SystemExit("Admin Login form count is not exactly one after isolation")

opening = re.search(r'(<form\b[^>]*\bid=["\']loginForm["\'][^>]*)(>)', text, re.I)
if not opening:
    raise SystemExit("Canonical login form opening not found")
opening_attrs = opening.group(1)
if not re.search(r"\bonsubmit\s*=", opening_attrs, re.I):
    opening_attrs = opening_attrs.rstrip() + ' onsubmit="event.preventDefault();"'
else:
    opening_attrs = re.sub(r'\bonsubmit\s*=\s*(["\']).*?\1', ' onsubmit="event.preventDefault();"', opening_attrs, count=1, flags=re.I | re.S)
text = text[:opening.start(1)] + opening_attrs + opening.group(2) + text[opening.end(2):]

inline = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.I | re.S)
legacy_markers = ("const SUPABASE_URL", "STAFF_LOGIN_FUNCTION", "function login", "clinic_staff")
for match in inline.finditer(text):
    attrs, body = match.group(1), match.group(2)
    if not re.search(r"(?<![-\w])src\s*=", attrs, re.I) and sum(marker in body for marker in legacy_markers) >= 3:
        raise SystemExit("Legacy inline Admin Login controller remains")

# Lazy-module registry ownership is verified by lazy-admin-modules.py and the
# final read-only graph gate. This shell isolation stage must not duplicate that
# responsibility or reject a valid registry whose formatting changed upstream.
registry_pattern = re.compile(
    r'<script\b[^>]*data-azaad-admin-module-registry=["\']1["\'][^>]*>.*?</script>',
    re.I | re.S,
)
registry_matches = list(registry_pattern.finditer(text))
if len(registry_matches) > 1:
    raise SystemExit("Canonical lazy registry exists more than once")
if registry_matches:
    registry = registry_matches[0]
    loader_assignment_pattern = re.compile(r'window\.AZAAD_LOAD_ADMIN_PANEL\s*=\s*', re.I)
    if len(loader_assignment_pattern.findall(registry.group(0))) != 1:
        raise SystemExit("Canonical lazy registry must expose exactly one panel loader")

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
print("[AZAAD final admin isolation] PASS: canonical login shell preserved; lazy registry ownership delegated to its dedicated gate")
