from pathlib import Path
import re

PATH = Path("admin.js")
if not PATH.exists():
    raise SystemExit("admin.js not found")

js = PATH.read_text(encoding="utf-8")


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


if "initializing: false" not in js:
    needle = "  initialized: false,\n  loadingBookings: false"
    if needle in js:
        js = js.replace(needle, "  initialized: false,\n  loadingBookings: false,\n  initializing: false", 1)
    else:
        raise SystemExit("Admin state initialization contract not found")

canonical_init = '''async function initializeApplication() {
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

init_bounds = bounds(js, "async function initializeApplication()")
if not init_bounds:
    raise SystemExit("initializeApplication() not found")
js = js[:init_bounds[0]] + canonical_init + js[init_bounds[1]:]

canonical_logout = '''async function logout() {
  state.initialized = false;
  state.initializing = false;
  state.session = null;
  state.user = null;
  state.staff = null;
  state.currentRole = null;
  state.permissions = new Set();

  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    window.location.replace("/admin.html");
  }
}
'''
logout_bounds = bounds(js, "async function logout()")
if not logout_bounds:
    raise SystemExit("logout() not found")
js = js[:logout_bounds[0]] + canonical_logout + js[logout_bounds[1]:]

# Navigation is not owned by admin.js. It exposes only a command bridge to the
# canonical admin-shell navigation owner. This keeps quick actions functional
# without introducing a second panel activation implementation.
for obsolete in ("function bindTabs()", "function switchPanel("):
    match = bounds(js, obsolete)
    if match:
        js = js[:match[0]] + js[match[1]:]

js = js.replace("switchPanel(", "requestPanel(")
bridge = '''
function requestPanel(panelId) {
  if (!panelId) return;
  window.dispatchEvent(new CustomEvent("azaad:admin-panel-requested", {
    detail: { panel: String(panelId) }
  }));
}
'''
if "function requestPanel(panelId)" not in js:
    marker = "/* ============================================================\n   PANELS\n   ============================================================ */"
    if marker in js:
        js = js.replace(marker, marker + "\n" + bridge, 1)
    else:
        js = bridge + "\n" + js

# Fail closed: prove the critical initialization boundary contains no navigation owner.
final = bounds(js, "async function initializeApplication()")
if not final:
    raise SystemExit("Final initializeApplication() boundary missing")
body = js[final[0]:final[1]]
required = [
    "bindBookingFilters();",
    "bindLogout();",
    "bindPatientPage();",
    "buildCommandCenter();",
]
load_pos = body.find("loadBookings()")
if load_pos < 0:
    raise SystemExit("Background loadBookings() call missing")
for statement in required:
    positions = [i for i in range(len(body)) if body.startswith(statement, i)]
    if len(positions) != 1 or positions[0] > load_pos:
        raise SystemExit(f"Critical binding ordering invalid: {statement}")
if "bindTabs();" in body:
    raise SystemExit("Admin core still owns tab navigation")
if "await loadBookings()" in body:
    raise SystemExit("initializeApplication still awaits loadBookings()")
if "await window.AZAAD_STAFF.init" in body:
    raise SystemExit("initializeApplication still awaits staff runtime")
if "loadAfterAuthRuntimes" in body:
    raise SystemExit("Post-auth runtime loader is still on the critical initialization path")
if "setTimeout(()" in body:
    raise SystemExit("Delayed post-auth work is still on the critical initialization path")
if "state.initialized = true;" not in body or "state.initializing = false;" not in body:
    raise SystemExit("Interactive state transition missing")

# Fail closed on any remaining legacy navigation symbol anywhere in the final
# generated controller. The shell is the only navigation owner.
if re.search(r"\bfunction\s+bindTabs\s*\(", js) or re.search(r"\bbindTabs\s*\(", js):
    raise SystemExit("Legacy bindTabs symbol remains in canonical admin.js")
if re.search(r"\bfunction\s+switchPanel\s*\(", js) or re.search(r"\bswitchPanel\s*\(", js):
    raise SystemExit("Legacy switchPanel symbol remains in canonical admin.js")

PATH.write_text(js, encoding="utf-8")
print("[AZAAD] admin core no longer owns navigation; shell is the sole panel activation owner")