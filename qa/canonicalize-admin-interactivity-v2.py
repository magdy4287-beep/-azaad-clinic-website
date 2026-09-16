from pathlib import Path
import re

PATH = Path("admin.js")
if not PATH.exists():
    raise SystemExit("admin.js not found")

js = PATH.read_text(encoding="utf-8")

# Canonical admin.js is already Appwrite/HttpOnly based. The production build
# must be idempotent: a canonical source is a valid input and must not be
# rewritten merely because this historical migration script still exists in the
# build manifest.
CANONICAL_MARKERS = (
    "fetch('/api/admin-auth'",
    "window.AZAAD_RESTORE_STAFF_PROFILE",
    "provider: 'appwrite'",
    "async function initializeApplication()",
)
LEGACY_RUNTIME_MARKERS = (
    'supabase.auth.getSession',
    'window.AZAAD?.supabase',
    'createClient(',
    'supabase.functions.invoke',
)
if all(marker in js for marker in CANONICAL_MARKERS):
    if any(marker in js for marker in LEGACY_RUNTIME_MARKERS):
        raise SystemExit("FAIL-CLOSED: canonical admin.js still contains a retired provider runtime marker")
    check_js = re.sub(r'/\*.*?\*/', '', js, flags=re.S)
    check_js = re.sub(r'(^|\s)//[^\n]*', r'\1', check_js)
    for pattern, message in (
        (r"\bfunction\s+bindTabs\s*\(", "Legacy bindTabs symbol remains in canonical admin.js"),
        (r"\bbindTabs\s*\(", "Legacy bindTabs call remains in canonical admin.js"),
        (r"\bfunction\s+switchPanel\s*\(", "Legacy switchPanel symbol remains in canonical admin.js"),
        (r"\bswitchPanel\s*\(", "Legacy switchPanel call remains in canonical admin.js"),
        (r"\brestoreSession\s*\(", "Retired restoreSession symbol remains in canonical admin.js"),
    ):
        if re.search(pattern, check_js):
            raise SystemExit(f"FAIL-CLOSED: {message}")
    print("[AZAAD] canonical admin interactivity already present; idempotent no-op PASS")
    raise SystemExit(0)

# Legacy migration path retained for historical branches that have not yet
# reached the canonical Appwrite controller. It is intentionally fail-closed
# rather than silently rewriting an unknown controller shape.
def bounds(source: str, marker: str):
    start = source.find(marker)
    if start < 0:
        return None
    brace = source.find("{", start)
    if brace < 0:
        return None
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""
        if line_comment:
            if ch == "\n": line_comment = False
            i += 1; continue
        if block_comment:
            if ch == "*" and nxt == "/": block_comment = False; i += 2; continue
            i += 1; continue
        if quote:
            if escape: escape = False
            elif ch == "\\": escape = True
            elif ch == quote: quote = None
            i += 1; continue
        if ch == "/" and nxt == "/": line_comment = True; i += 2; continue
        if ch == "/" and nxt == "*": block_comment = True; i += 2; continue
        if ch in "'\"`": quote = ch; i += 1; continue
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0: return start, i + 1
        i += 1
    return None

if "initializing: false" not in js:
    needle = "  initialized: false,\n  loadingBookings: false"
    if needle in js:
        js = js.replace(needle, "  initialized: false,\n  loadingBookings: false,\n  initializing: false", 1)
    else:
        raise SystemExit("Admin state initialization contract not found")

canonical_init = '''async function initializeApplication() {
  if (state.initialized || state.initializing) return;
  if (!state.session || !state.staff || !state.currentRole) return;

  state.initializing = true;
  if (!state.user?.id && state.staff?.auth_user_id) state.user = { id: state.staff.auth_user_id };
  const loginPage = $("loginPage"); const adminPage = $("adminPage");
  if (loginPage) loginPage.classList.add("hidden");
  if (adminPage) adminPage.classList.remove("hidden");
  updateUserIdentity(); bindBookingFilters(); bindLogout(); bindPatientPage(); buildCommandCenter();
  state.initialized = true; state.initializing = false;
  window.dispatchEvent(new CustomEvent("azaad:admin-authenticated"));
  void loadBookings().catch(error => console.error("Background booking load error:", error));
  showToast(`🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`, "success");
}
'''
init_bounds = bounds(js, "async function initializeApplication()")
if not init_bounds: raise SystemExit("initializeApplication() not found")
js = js[:init_bounds[0]] + canonical_init + js[init_bounds[1]:]

logout_bounds = bounds(js, "async function logout()")
if not logout_bounds: raise SystemExit("logout() not found")
canonical_logout = '''async function logout() {
  state.initialized = false; state.initializing = false; state.session = null; state.user = null; state.staff = null; state.currentRole = null; state.permissions = new Set();
  try { await Promise.race([fetch('/api/admin-auth', { method:'DELETE', credentials:'include', cache:'no-store', headers:{Accept:'application/json'} }), new Promise(resolve => setTimeout(resolve, 2500))]); } catch (error) { console.warn('Appwrite logout boundary failed:', error); }
  window.location.replace('/admin.html');
}
'''
js = js[:logout_bounds[0]] + canonical_logout + js[logout_bounds[1]:]

restore_bounds = bounds(js, "async function restoreSession()")
if restore_bounds: js = js[:restore_bounds[0]] + js[restore_bounds[1]:]
for obsolete in ("function bindTabs()", "function switchPanel("):
    match = bounds(js, obsolete)
    if match: js = js[:match[0]] + js[match[1]:]
js = re.sub(r'(?m)^\s*bindTabs\(\);\s*\n?', '', js)
js = re.sub(r'(?m)^\s*switchPanel\([^;]+;\s*\n?', '', js)
js = js.replace("switchPanel(", "requestPanel(")
if "function requestPanel(panelId)" not in js:
    bridge = '''\nfunction requestPanel(panelId) {\n  if (!panelId) return;\n  window.dispatchEvent(new CustomEvent("azaad:admin-panel-requested", { detail: { panel: String(panelId) } }));\n}\n'''
    js = bridge + "\n" + js

startup_pattern = re.compile(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']\s*,\s*async\s*\(\)\s*=>\s*\{.*?\}\s*\)\s*;\s*$', re.S)
canonical_startup = '''document.addEventListener("DOMContentLoaded", async () => {
  bindLogin(); bindLogout(); bindBookingFilters(); bindPatientPage();
  try { const response = await fetch('/api/admin-auth', { credentials:'include', cache:'no-store', headers:{Accept:'application/json'} }); const result = await response.json().catch(() => ({})); if (!response.ok || !result.authenticated || !result.staff) return; state.session = Object.freeze({ provider:'appwrite' }); state.user = result.user || null; if (applyStaffRole(result.staff)) await initializeApplication(); }
  catch (error) { console.error("Application startup error:", error); showToast(error?.message || "تعذر استعادة جلسة الدخول.", "error"); }
});'''
if startup_pattern.search(js): js = startup_pattern.sub(canonical_startup, js, count=1)
else: raise SystemExit("Canonical Admin DOMContentLoaded startup block not found")

final = bounds(js, "async function initializeApplication()")
if not final: raise SystemExit("Final initializeApplication() boundary missing")
body = js[final[0]:final[1]]
load_pos = body.find("loadBookings()")
if load_pos < 0: raise SystemExit("Background loadBookings() call missing")
for statement in ("bindBookingFilters();", "bindLogout();", "bindPatientPage();", "buildCommandCenter();"):
    positions = [i for i in range(len(body)) if body.startswith(statement, i)]
    if len(positions) != 1 or positions[0] > load_pos: raise SystemExit(f"Critical binding ordering invalid: {statement}")

check_js = re.sub(r'/\*.*?\*/', '', js, flags=re.S)
check_js = re.sub(r'(^|\s)//[^\n]*', r'\1', check_js)
for pattern, message in ((r"\bfunction\s+bindTabs\s*\(", "Legacy bindTabs symbol remains in canonical admin.js"),(r"\bbindTabs\s*\(", "Legacy bindTabs call remains in canonical admin.js"),(r"\bfunction\s+switchPanel\s*\(", "Legacy switchPanel symbol remains in canonical admin.js"),(r"\bswitchPanel\s*\(", "Legacy switchPanel call remains in canonical admin.js"),(r"\brestoreSession\s*\(", "Retired restoreSession symbol remains in canonical admin.js")):
    if re.search(pattern, check_js): raise SystemExit(f"FAIL-CLOSED: {message}")
PATH.write_text(js, encoding='utf-8')
print('[AZAAD] admin interactivity migration PASS')
