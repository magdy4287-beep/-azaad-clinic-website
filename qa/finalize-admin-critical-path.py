from pathlib import Path
import re

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")


def function_bounds(source, marker):
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
            if ch == "*" and nxt == "/":
                block_comment = False; i += 2; continue
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

# Authentication must never await application initialization.
js = re.sub(
    r"\bawait\s+initializeApplication\s*\(\s*\)\s*;",
    '''void initializeApplication().catch(error =>
    console.error("Admin initialization error:", error
  ));''',
    js,
)

# The staff-login Edge Function is the authentication boundary. Establish the
# authenticated shell state directly from its result; Supabase client persistence
# remains a background concern.
login_bounds = function_bounds(js, "async function login(")
if login_bounds is None:
    raise SystemExit("login() not found or malformed")
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
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY
    },
    body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
  });

  let result = null;
  try {
    const responseText = await response.text();
    result = responseText ? JSON.parse(responseText) : null;
  } catch (_) {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.error || result?.message || "بيانات الدخول غير صحيحة.");
  }
  if (!result?.session?.access_token || !result?.session?.refresh_token) {
    throw new Error("تعذر إنشاء جلسة تسجيل الدخول.");
  }
  if (!result?.staff) {
    throw new Error("تم تسجيل الدخول ولكن لم يتم العثور على ملف الموظف.");
  }
  if (result.staff.active === false) {
    throw new Error("حساب الموظف غير فعال.");
  }
  if (!applyStaffRole(result.staff)) {
    throw new Error("دور الموظف غير صالح.");
  }

  state.session = result.session;
  state.user = result.user || null;
  state.staff = result.staff;
  state.currentRole = String(result.staff.role || "").toUpperCase().trim();
  state.permissions = new Set(ROLE_PERMISSIONS[state.currentRole] || []);
  document.body.dataset.role = state.currentRole;

  if (redirectDoctorIfNeeded()) return;

  void initializeApplication().catch(error =>
    console.error("Admin initialization error:", error)
  );

  void supabase.auth.setSession({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token
  }).then(({ error }) => {
    if (error) console.error("Supabase client session persistence error:", error);
  }).catch(error => {
    console.error("Supabase client session persistence exception:", error);
  });
}
'''
js = js[:login_start] + login_canonical + js[login_end:]

marker = "async function initializeApplication()"
bounds = function_bounds(js, marker)
if bounds is None:
    raise SystemExit("initializeApplication() not found or malformed")
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

  void loadBookings().catch(error =>
    console.error("Background booking load error:", error)
  );

  if (window.AZAAD_STAFF && typeof window.AZAAD_STAFF.init === "function") {
    Promise.resolve()
      .then(() => window.AZAAD_STAFF.init())
      .catch(error => console.error("Staff management init error:", error));
  }

  showToast(`🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`, "success");
}
'''
js = js[:start] + canonical + js[end:]

if "initializing: false" not in js:
    js = js.replace(
        "  initialized: false,\n  loadingBookings: false",
        "  initialized: false,\n  loadingBookings: false,\n  initializing: false",
        1,
    )

runtime_marker = "async function loadAfterAuthRuntimes()"
runtime_bounds = function_bounds(js, runtime_marker)
if runtime_bounds is not None:
    rstart, rend = runtime_bounds
    js = js[:rstart] + '''async function loadAfterAuthRuntimes() {
  // DISABLED: optional runtimes must be explicitly loaded by their owning panel.
  return;
}
''' + js[rend:]

# Canonical startup owner. The retired restoreSession symbol is not part of the
# production startup contract; existing sessions are restored through the same
# restoreStaffProfile() boundary used by the authenticated state owner.
startup_pattern = re.compile(
    r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']\s*,\s*async\s*\(\)\s*=>\s*\{.*?\}\s*\)\s*;\s*$',
    re.S,
)
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
if startup_pattern.search(js):
    js = startup_pattern.sub(canonical_startup, js, count=1)
else:
    raise SystemExit("Canonical Admin DOMContentLoaded startup block not found")

# Final fail-closed contract for this late transform: it may not reintroduce a
# second navigation owner or the retired restoreSession entry point.
check_js = re.sub(r'/\*.*?\*/', '', js, flags=re.S)
check_js = re.sub(r'(^|\s)//[^\n]*', r'\1', check_js)
if re.search(r"\bfunction\s+bindTabs\s*\(", check_js) or re.search(r"\bbindTabs\s*\(", check_js):
    raise SystemExit("Legacy bindTabs symbol reintroduced by final Admin critical path")
if re.search(r"\bfunction\s+switchPanel\s*\(", check_js) or re.search(r"\bswitchPanel\s*\(", check_js):
    raise SystemExit("Legacy switchPanel symbol reintroduced by final Admin critical path")
if re.search(r"\brestoreSession\s*\(", check_js):
    raise SystemExit("Retired restoreSession symbol reintroduced by final Admin critical path")

bounds = function_bounds(js, marker)
if bounds is None:
    raise SystemExit("Final initializeApplication() boundary could not be determined")
final_body = js[bounds[0]:bounds[1]]
required = (
    "bindBookingFilters();",
    "bindLogout();",
    "bindPatientPage();",
    "buildCommandCenter();",
)
load_match = re.search(r"\b(?:void\s+)?loadBookings\s*\(", final_body)
if not load_match:
    raise SystemExit("Background booking initialization call is missing")
for statement in required:
    positions = [m.start() for m in re.finditer(re.escape(statement), final_body)]
    if len(positions) != 1 or positions[0] >= load_match.start():
        raise SystemExit(f"Critical Admin binding ordering invalid: {statement}")
if "await loadBookings();" in final_body:
    raise SystemExit("Admin initialization still awaits bookings")
if "await loadAfterAuthRuntimes();" in final_body:
    raise SystemExit("Admin initialization still awaits optional runtimes")
if "state.initialized = true;" not in final_body or "state.initializing = false;" not in final_body:
    raise SystemExit("Admin interactive state transition is missing")

path.write_text(js, encoding="utf-8")
print("[AZAAD] Admin critical path canonicalized: authentication is non-blocking, navigation is shell-owned, and restoreSession is retired")
