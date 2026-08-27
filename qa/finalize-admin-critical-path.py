from pathlib import Path
import re

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

def function_bounds(source, marker):
    start = source.find(marker)
    if start < 0: return None
    brace = source.find("{", start)
    if brace < 0: return None
    depth = 0; quote = None; escape = False; line_comment = False; block_comment = False; i = brace
    while i < len(source):
        ch = source[i]; nxt = source[i + 1] if i + 1 < len(source) else ""
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

js = re.sub(r"\bawait\s+initializeApplication\s*\(\s*\)\s*;", '''void initializeApplication().catch(error =>
    console.error("Admin initialization error:", error
  ));''', js)

login_bounds = function_bounds(js, "async function login(")
if login_bounds is None: raise SystemExit("login() not found or malformed")
login_start, login_end = login_bounds
login_canonical = '''async function login(
  username,
  password
) {
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  if (!cleanUsername) throw new Error("اسم المستخدم مطلوب.");
  if (!cleanPassword) throw new Error("كلمة المرور مطلوبة.");

  const response = await fetch(STAFF_LOGIN_FUNCTION, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
  });

  let result = null;
  try {
    const responseText = await response.text();
    result = responseText ? JSON.parse(responseText) : null;
  } catch (_) {}

  if (!response.ok) throw new Error(result?.error || result?.message || "بيانات الدخول غير صحيحة.");
  if (!result?.session?.access_token || !result?.session?.refresh_token) throw new Error("تعذر إنشاء جلسة تسجيل الدخول.");
  if (!result?.staff) throw new Error("تم تسجيل الدخول ولكن لم يتم العثور على ملف الموظف.");
  if (result.staff.active === false) throw new Error("حساب الموظف غير فعال.");
  if (!applyStaffRole(result.staff)) throw new Error("دور الموظف غير صالح.");

  state.session = result.session;
  // staff-login may omit a top-level user object. The authenticated Supabase
  // session is the authoritative identity payload; never leave state.user null
  // after a successful staff-login response.
  state.user = result.user || result.session?.user || null;
  if (!state.user?.id && result.staff?.user_id) state.user = { id: result.staff.user_id };
  state.staff = result.staff;
  state.currentRole = String(result.staff.role || "").toUpperCase().trim();
  state.permissions = new Set(ROLE_PERMISSIONS[state.currentRole] || []);
  document.body.dataset.role = state.currentRole;

  if (redirectDoctorIfNeeded()) return;

  void initializeApplication().catch(error => console.error("Admin initialization error:", error));

  void supabase.auth.setSession({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token
  }).then(({ error }) => {
    if (error) console.error("Supabase client session persistence error:", error);
  }).catch(error => console.error("Supabase client session persistence exception:", error));
}
'''
js = js[:login_start] + login_canonical + js[login_end:]

marker = "async function initializeApplication()"
bounds = function_bounds(js, marker)
if bounds is None: raise SystemExit("initializeApplication() not found or malformed")
start, end = bounds
canonical = '''async function initializeApplication() {
  if (state.initialized || state.initializing) return;
  if (!state.session || !state.user || !state.staff || !state.currentRole) return;

  state.initializing = true;
  const loginPage = $("loginPage");
  const adminPage = $("adminPage");
  if (loginPage) loginPage.classList.add("hidden");
  if (adminPage) adminPage.classList.remove("hidden");

  updateUserIdentity();
  bindBookingFilters();
  bindLogout();
  bindPatientPage();
  buildCommandCenter();

  state.initialized = true;
  state.initializing = false;

  void loadBookings().catch(error => console.error("Background booking load error:", error));

  if (window.AZAAD_STAFF && typeof window.AZAAD_STAFF.init === "function") {
    Promise.resolve().then(() => window.AZAAD_STAFF.init()).catch(error => console.error("Staff management init error:", error));
  }

  showToast(`🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`, "success");
}
'''
js = js[:start] + canonical + js[end:]

if "initializing: false" not in js:
    js = js.replace("  initialized: false,\n  loadingBookings: false", "  initialized: false,\n  loadingBookings: false,\n  initializing: false", 1)

runtime_marker = "async function loadAfterAuthRuntimes()"
runtime_bounds = function_bounds(js, runtime_marker)
if runtime_bounds is not None:
    rstart, rend = runtime_bounds
    js = js[:rstart] + "async function loadAfterAuthRuntimes() {\n  return;\n}\n" + js[rend:]

for obsolete in ("function bindTabs()", "function switchPanel("):
    obsolete_bounds = function_bounds(js, obsolete)
    if obsolete_bounds is not None: js = js[:obsolete_bounds[0]] + js[obsolete_bounds[1]:]
js = re.sub(r'(?m)^\s*bindTabs\(\);\s*\n?', '', js)
js = re.sub(r'(?m)^\s*switchPanel\([^;]+;\s*\n?', '', js)
js = js.replace("switchPanel(", "requestPanel(")
bridge = '''
function requestPanel(panelId) {
  if (!panelId) return;
  window.dispatchEvent(new CustomEvent("azaad:admin-panel-requested", { detail: { panel: String(panelId) } }));
}
'''
if "function requestPanel(panelId)" not in js:
    panel_marker = "/* ============================================================\n   PANELS\n   ============================================================ */"
    if panel_marker in js: js = js.replace(panel_marker, panel_marker + "\n" + bridge, 1)

restore_bounds = function_bounds(js, "async function restoreSession()")
if restore_bounds is not None: js = js[:restore_bounds[0]] + js[restore_bounds[1]:]

startup_pattern = re.compile(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']\s*,\s*async\s*\(\)\s*=>\s*\{.*?\}\s*\)\s*;\s*$', re.S)
canonical_startup = '''document.addEventListener("DOMContentLoaded", async () => {
  bindLogin();
  bindLogout();
  bindBookingFilters();
  bindPatientPage();
  try {
    const result = await supabase.auth.getSession();
    const session = result?.data?.session || null;
    if (!session) return;
    state.session = session;
    state.user = session.user || null;
    const validStaff = await restoreStaffProfile();
    if (validStaff) await initializeApplication();
  } catch (error) {
    console.error("Application startup error:", error);
    showToast(error?.message || "تعذر استعادة جلسة الدخول.", "error");
  }
});'''
if startup_pattern.search(js): js = startup_pattern.sub(canonical_startup, js, count=1)
else: raise SystemExit("Canonical Admin DOMContentLoaded startup block not found")

check_js = re.sub(r'/\*.*?\*/', '', js, flags=re.S)
check_js = re.sub(r'(^|\s)//[^\n]*', r'\1', check_js)
for symbol in (r"\bbindTabs\s*\(", r"\bswitchPanel\s*\(", r"\brestoreSession\s*\("):
    if re.search(symbol, check_js): raise SystemExit(f"Retired Admin symbol remains after final critical-path transform: {symbol}")

bounds = function_bounds(js, marker)
if bounds is None: raise SystemExit("Final initializeApplication() boundary could not be determined")
final_body = js[bounds[0]:bounds[1]]
required = ("bindBookingFilters();", "bindLogout();", "bindPatientPage();", "buildCommandCenter();")
load_match = re.search(r"\b(?:void\s+)?loadBookings\s*\(", final_body)
if not load_match: raise SystemExit("Background booking initialization call is missing")
for statement in required:
    positions = [m.start() for m in re.finditer(re.escape(statement), final_body)]
    if len(positions) != 1 or positions[0] >= load_match.start(): raise SystemExit(f"Critical Admin binding ordering invalid: {statement}")
if "await loadBookings();" in final_body or "await loadAfterAuthRuntimes();" in final_body: raise SystemExit("Admin initialization still awaits non-critical runtime work")
if "state.initialized = true;" not in final_body or "state.initializing = false;" not in final_body: raise SystemExit("Admin interactive state transition is missing")

path.write_text(js, encoding="utf-8")
print("[AZAAD] final Admin critical path: one auth owner, shell-owned navigation, session identity preserved")
