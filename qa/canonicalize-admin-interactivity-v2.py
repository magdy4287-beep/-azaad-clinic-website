from pathlib import Path

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
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in "'\"`":
            quote = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return start, i + 1
        i += 1
    return None


# State guard: exactly one initialization race flag.
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

  // Critical interaction ownership is established before every network/optional task.
  updateUserIdentity();
  bindTabs();
  bindBookingFilters();
  bindLogout();
  bindPatientPage();
  buildCommandCenter();

  // The authenticated shell is interactive NOW. Nothing below may gate input/logout.
  state.initialized = true;
  state.initializing = false;

  // Data is explicitly background-only.
  void loadBookings().catch(error =>
    console.error("Background booking load error:", error)
  );

  // Optional staff UI is explicitly background-only and isolated from the shell.
  if (window.AZAAD_STAFF && typeof window.AZAAD_STAFF.init === "function") {
    Promise.resolve()
      .then(() => window.AZAAD_STAFF.init())
      .catch(error => console.error("Staff management init error:", error));
  }

  showToast(`🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`, "success");
}
'''

init_marker = "async function initializeApplication()"
init_bounds = bounds(js, init_marker)
if not init_bounds:
    raise SystemExit("initializeApplication() not found")
js = js[:init_bounds[0]] + canonical_init + js[init_bounds[1]:]

# Canonical logout: clear local auth state immediately; network sign-out has a hard timeout.
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

# Fail closed: prove the critical ordering in the final source artifact.
final = bounds(js, init_marker)
if not final:
    raise SystemExit("Final initializeApplication() boundary missing")
body = js[final[0]:final[1]]
required = [
    "bindTabs();",
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

PATH.write_text(js, encoding="utf-8")
print("[AZAAD] canonical admin interactive boundary enforced and post-auth runtime reblocking rejected")