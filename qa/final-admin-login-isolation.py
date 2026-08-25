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

# Legacy panel-loader cleanup is intentionally structural: remove only loader
# scripts that are NOT the canonical registry. The canonical registry itself is
# never removed by this pass.
canonical_registry_tag = re.compile(
    r'<script\b[^>]*data-azaad-admin-module-registry=["\']1["\'][^>]*>.*?</script>',
    re.I | re.S,
)
legacy_panel_loader = re.compile(
    r'<script\b(?![^>]*data-azaad-admin-module-registry=["\']1["\'])[^>]*>.*?window\.AZAAD_LOAD_ADMIN_PANEL\s*=.*?</script>',
    re.I | re.S,
)
text, removed_loader_count = legacy_panel_loader.subn("\n", text)
canonical_registry = bool(canonical_registry_tag.search(text))
if not canonical_registry:
    if "window.AZAAD_LOAD_ADMIN_PANEL" in text:
        raise SystemExit("Duplicate Admin panel loader remains but no canonical registry is present")

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

inline = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.I | re.S)
legacy_markers = ("const SUPABASE_URL", "STAFF_LOGIN_FUNCTION", "function login", "clinic_staff")
for match in inline.finditer(text):
    attrs, body = match.group(1), match.group(2)
    if not re.search(r"(?<![-\w])src\s*=", attrs, re.I) and sum(marker in body for marker in legacy_markers) >= 3:
        raise SystemExit("Legacy inline Admin Login controller remains")

if len(re.findall(r'<form\b[^>]*\bid=[\"\']loginForm[\"\']', text, re.I)) != 1:
    raise SystemExit("Admin Login form count is not exactly one")

# Ownership invariant: exactly one loader definition must live INSIDE the
# canonical registry and zero loader definitions may exist outside it. This is
# stronger than counting the whole document because the registry is explicitly
# allowed to define the one canonical loader.
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
