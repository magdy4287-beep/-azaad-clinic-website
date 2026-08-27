from pathlib import Path
import re

PATH = Path("admin.js")
if not PATH.exists(): raise SystemExit("admin.js not found")
js = PATH.read_text(encoding="utf-8")

def bounds(source: str, marker: str):
    start = source.find(marker)
    if start < 0: return None
    brace = source.find("{", start)
    if brace < 0: return None
    depth=0; quote=None; escape=False; line_comment=False; block_comment=False; i=brace
    while i < len(source):
        ch=source[i]; nxt=source[i+1] if i+1 < len(source) else ""
        if line_comment:
            if ch=="\n": line_comment=False
            i+=1; continue
        if block_comment:
            if ch=="*" and nxt=="/": block_comment=False; i+=2; continue
            i+=1; continue
        if quote:
            if escape: escape=False
            elif ch=="\\": escape=True
            elif ch==quote: quote=None
            i+=1; continue
        if ch=="/" and nxt=="/": line_comment=True; i+=2; continue
        if ch=="/" and nxt=="*": block_comment=True; i+=2; continue
        if ch in "'\"`": quote=ch; i+=1; continue
        if ch=="{": depth+=1
        elif ch=="}":
            depth-=1
            if depth==0: return start,i+1
        i+=1
    return None

login=bounds(js,"async function login(")
if not login: raise SystemExit("login() not found")
login_fn='''async function login(username, password) {
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
  state.user = result.user || result.session?.user || null;
  if (!state.user?.id && result.staff?.auth_user_id) state.user = { id: result.staff.auth_user_id };
  state.staff = result.staff;
  state.currentRole = String(result.staff.role || "").toUpperCase().trim();
  state.permissions = new Set(ROLE_PERMISSIONS[state.currentRole] || []);
  document.body.dataset.role = state.currentRole;

  if (redirectDoctorIfNeeded()) return;

  void initializeApplication().catch(error => console.error("Admin initialization error:", error));

  void supabase.auth.setSession({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token
  }).catch(error => console.error("Supabase client session persistence error:", error));
}
'''
js=js[:login[0]]+login_fn+js[login[1]:]

init=bounds(js,"async function initializeApplication(")
if not init: raise SystemExit("initializeApplication() not found")
init_fn='''async function initializeApplication() {
  if (state.initialized || state.initializing) return;
  // staff-login is the authoritative Admin identity boundary. The optional
  // Supabase user payload must never block shell activation after valid login.
  if (!state.session || !state.staff || !state.currentRole) return;

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
    Promise.resolve().then(() => window.AZAAD_STAFF.init())
      .catch(error => console.error("Staff management init error:", error));
  }

  showToast(`🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`, "success");
}
'''
js=js[:init[0]]+init_fn+js[init[1]:]

if "initializing: false" not in js:
    js=js.replace("  initialized: false,\n  loadingBookings: false","  initialized: false,\n  loadingBookings: false,\n  initializing: false",1)

for marker in ("function bindTabs()","function switchPanel(","async function restoreSession()"):
    found=bounds(js,marker)
    if found: js=js[:found[0]]+js[found[1]:]
js=re.sub(r"(?m)^\s*bindTabs\(\);\s*\n?", "", js)
js=re.sub(r"(?m)^\s*switchPanel\([^;]+;\s*\n?", "", js)
js=js.replace("switchPanel(","requestPanel(")
bridge='''\nfunction requestPanel(panelId) {\n  if (!panelId) return;\n  window.dispatchEvent(new CustomEvent("azaad:admin-panel-requested", { detail: { panel: String(panelId) } }));\n}\n'''
if "function requestPanel(panelId)" not in js:
    marker="/* ============================================================\n   PANELS\n   ============================================================ */"
    if marker in js: js=js.replace(marker,marker+"\n"+bridge,1)

startup_pattern=re.compile(r"document\.addEventListener\(\s*['\"]DOMContentLoaded['\"]\s*,\s*async\s*\(\)\s*=>\s*\{.*?\}\s*\)\s*;\s*$",re.S)
startup='''document.addEventListener("DOMContentLoaded", async () => {
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
if startup_pattern.search(js): js=startup_pattern.sub(startup,js,count=1)
else: raise SystemExit("Canonical Admin DOMContentLoaded startup block not found")

check=re.sub(r"/\*.*?\*/","",js,flags=re.S)
check=re.sub(r"(^|\s)//[^\n]*",r"\1",check)
for symbol in (r"\bbindTabs\s*\(",r"\bswitchPanel\s*\(",r"\brestoreSession\s*\("):
    if re.search(symbol,check): raise SystemExit(f"Retired Admin symbol remains: {symbol}")

init=bounds(js,"async function initializeApplication(")
if not init: raise SystemExit("Final initializeApplication boundary missing")
body=js[init[0]:init[1]]
load_pos=body.find("loadBookings()")
if load_pos<0: raise SystemExit("Background loadBookings call missing")
for statement in ("bindBookingFilters();","bindLogout();","bindPatientPage();","buildCommandCenter();"):
    positions=[m.start() for m in re.finditer(re.escape(statement),body)]
    if len(positions)!=1 or positions[0]>load_pos: raise SystemExit(f"Critical binding ordering invalid: {statement}")
if "await loadBookings()" in body or "await window.AZAAD_STAFF.init" in body: raise SystemExit("Admin initialization still awaits non-critical work")
if "state.initialized = true;" not in body or "state.initializing = false;" not in body: raise SystemExit("Admin interactive state transition missing")

PATH.write_text(js,encoding="utf-8")
print("[AZAAD] final Admin critical path PASS: staff-login identity is sufficient for shell activation")
