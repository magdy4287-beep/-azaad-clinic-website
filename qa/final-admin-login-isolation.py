from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN=Path("admin.html")
if not ADMIN.exists(): raise SystemExit("admin.html not found")
text=ADMIN.read_text(encoding="utf-8")
FORM_RE=re.compile(r"<form\b([^>]*)>(.*?)</form>",re.I|re.S)
LOGIN_RE=re.compile(r'\bid\s*=\s*(["\'])loginForm\1',re.I)
ADMIN_PAGE_RE=re.compile(r'<(?:div|section|main)\b[^>]*\bid\s*=\s*(["\'])adminPage\1[^>]*>',re.I)
forms_before=list(FORM_RE.finditer(text)); login_forms_before=[m for m in forms_before if LOGIN_RE.search(m.group(1))]
if len(login_forms_before)!=1:
    semantic=[m for m in forms_before if re.search(r'<input\b[^>]*\btype\s*=\s*(["\'])password\1',m.group(2),re.I) and re.search(r'<button\b[^>]*\btype\s*=\s*(["\'])submit\1',m.group(2),re.I)]
    if len(semantic)!=1: raise SystemExit("Canonical login form not found before isolation")
    attrs=re.sub(r'\s+\bid\s*=\s*(["\'])[^"\']*\1','',semantic[0].group(1),count=1,flags=re.I)
    normalized='<form id="loginForm"'+attrs+'>'+semantic[0].group(2)+'</form>'
    text=text[:semantic[0].start()]+normalized+text[semantic[0].end():]
    login_forms_before=[m for m in FORM_RE.finditer(text) if LOGIN_RE.search(m.group(1))]
if len(login_forms_before)!=1: raise SystemExit("Admin login form count is not exactly one before isolation")
canonical_login_form=login_forms_before[0].group(0)
script_open=re.compile(r"<script\b([^>]*)>",re.I|re.S)
src_attr=re.compile(r"(?<![-\w])src\s*=\s*(?:([\"'])(.*?)\1|([^\s>]+))",re.I|re.S)
type_module=re.compile(r"\btype\s*=\s*([\"'])module\1",re.I)
# Pre-auth control plane: authentication, central i18n, shell navigation, and role navigation.
PRE_AUTH_RUNTIME_PATHS={"admin.js","central-i18n.js","admin-shell.js","azaad-role-experience.js"}
def isolate(match):
    attrs=match.group(1); found=src_attr.search(attrs)
    if not found: return match.group(0)
    src=found.group(2) if found.group(2) is not None else found.group(3)
    path=(urlsplit(src).path or src).lstrip("/").lower()
    if path in PRE_AUTH_RUNTIME_PATHS:
        if path=="central-i18n.js":
            attrs=re.sub(r"\bdefer(?:\s*=\s*(?:[\"'])?[^\s>\"']*(?:[\"'])?)?","",attrs,flags=re.I)
            return "<script"+attrs.rstrip()+" defer>"
        return match.group(0)
    module_attr=' data-azaad-after-auth-type="module"' if type_module.search(attrs) else ''
    remainder=(attrs[:found.start()]+attrs[found.end():]).strip()
    return f'<script data-azaad-after-auth-src="{src}"{module_attr}{(" "+remainder) if remainder else ""}>'
text=script_open.sub(isolate,text)
known=["/azaad-core-context.js?v=1.0.0","./scheduling-v2.js?v=1.0.0","./scheduling-v2-waiting.js?v=1.0.0","./patients-center.js?v=7.5.0","./doctor-route-guard.js?v=2.0.0","/azaad-role-experience.js?v=1.0.0","azaad-platform-kernel.js","azaad-operations-role-guard.js","azaad-operations-control-center.js","frontdesk-workflow.js","patient-mrn-display-v2.js","public-team-admin.js","ai-operating-center.js","waiting-list-center.js","doctor-visit-actions.js","secretary-hybrid-workflow.js","azaad-platform-control-plane.js","admin-media-editor.js?v=2026.08.23.1","./patient-appointment-actions.js","/doctor-services-admin.js"]
for src in known:
    if (urlsplit(src).path or src).lstrip('/').lower()=="azaad-role-experience.js": continue
    escaped=re.escape(src)
    text=re.sub(rf'(?<![-\w])src\s*=\s*(["\']){escaped}\1',lambda m:f'data-azaad-after-auth-src={m.group(1)}{src}{m.group(1)}',text,flags=re.I)
legacy_panel_loader=re.compile(r'<script\b(?![^>]*data-azaad-admin-module-registry=["\']1["\'])[^>]*>.*?</script>',re.I|re.S)
def strip_legacy_panel_loader(match):
    block=match.group(0)
    return "\n" if re.search(r'window\.AZAAD_LOAD_ADMIN_PANEL\s*=\s*',block,re.I) else block
text=legacy_panel_loader.sub(strip_legacy_panel_loader,text)
forms_after=list(FORM_RE.finditer(text)); login_forms=[m for m in forms_after if LOGIN_RE.search(m.group(1))]
if len(login_forms)==0:
    marker=ADMIN_PAGE_RE.search(text); body_end=re.search(r'</body\s*>',text,re.I)
    insert_at=marker.start() if marker else (body_end.start() if body_end else None)
    if insert_at is None: raise SystemExit("Admin shell marker and body boundary are both missing while restoring login form")
    text=text[:insert_at]+canonical_login_form+"\n\n"+text[insert_at:]
    login_forms=[m for m in FORM_RE.finditer(text) if LOGIN_RE.search(m.group(1))]
if len(login_forms)!=1: raise SystemExit("Admin Login form count is not exactly one after isolation")
opening=re.search(r'(<form\b[^>]*\bid=["\']loginForm["\'][^>]*)(>)',text,re.I)
if not opening: raise SystemExit("Canonical login form opening not found")
opening_attrs=opening.group(1)
if not re.search(r"\bonsubmit\s*=",opening_attrs,re.I): opening_attrs=opening_attrs.rstrip()+' onsubmit="event.preventDefault();"'
else: opening_attrs=re.sub(r'\bonsubmit\s*=\s*(["\']).*?\1',' onsubmit="event.preventDefault();"',opening_attrs,count=1,flags=re.I|re.S)
text=text[:opening.start(1)]+opening_attrs+opening.group(2)+text[opening.end(2):]
inline=re.compile(r"<script\b([^>]*)>(.*?)</script>",re.I|re.S)
legacy_markers=("const SUPABASE_URL","STAFF_LOGIN_FUNCTION","function login","clinic_staff")
for match in inline.finditer(text):
    attrs,body=match.group(1),match.group(2)
    if not re.search(r"(?<![-\w])src\s*=",attrs,re.I) and sum(marker in body for marker in legacy_markers)>=3: raise SystemExit("Legacy inline Admin Login controller remains")
registry_pattern=re.compile(r'<script\b[^>]*data-azaad-admin-module-registry=["\']1["\'][^>]*>.*?</script>',re.I|re.S)
registry_matches=list(registry_pattern.finditer(text))
if len(registry_matches)>1: raise SystemExit("Canonical lazy registry exists more than once")
if not registry_matches: raise SystemExit("Canonical lazy registry is missing")
registry=registry_matches[0]
loader_definition_pattern=re.compile(r'window\.AZAAD_LOAD_ADMIN_PANEL\s*=\s*(?:async\s+)?function\b',re.I)
loader_definitions=list(loader_definition_pattern.finditer(text))
if len(loader_definitions)!=1: raise SystemExit("Canonical lazy registry must expose exactly one panel loader definition")
if not (registry.start()<=loader_definitions[0].start()<registry.end()): raise SystemExit("Admin panel loader definition exists outside canonical lazy registry")
loader_references=len(re.findall(r'window\.AZAAD_LOAD_ADMIN_PANEL\b',text,re.I))
if loader_references<1: raise SystemExit("Canonical panel loader reference is missing")
executable=[]
for match in script_open.finditer(text):
    attrs=match.group(1); found=src_attr.search(attrs)
    if not found: continue
    src=found.group(2) if found.group(2) is not None else found.group(3)
    path=(urlsplit(src).path or src).lstrip('/').lower()
    if path not in PRE_AUTH_RUNTIME_PATHS: executable.append(src)
if executable: raise SystemExit("Non-canonical Admin runtimes remain executable: "+", ".join(executable))
if text.count('data-azaad-after-auth-src=')<1: raise SystemExit("No post-auth runtime manifest was produced")
ADMIN.write_text(text,encoding="utf-8")
print("[AZAAD final admin isolation] PASS: exactly one lazy panel-loader definition remains inside the canonical registry; references are allowed")
