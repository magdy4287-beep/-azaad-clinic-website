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
    for i in range(brace, len(source)):
        if source[i] == "{":
            depth += 1
        elif source[i] == "}":
            depth -= 1
            if depth == 0:
                return start, i + 1
    return None

# Authentication must never await application initialization.
js = re.sub(
    r"\bawait\s+initializeApplication\s*\(\s*\)\s*;",
    '''void initializeApplication().catch(error =>\n    console.error("Admin initialization error:", error\n  ));''',
    js,
)

marker = "async function initializeApplication()"
bounds = function_bounds(js, marker)
if bounds is None:
    raise SystemExit("initializeApplication() not found or malformed")

start, end = bounds

# Canonicalize the whole critical function instead of trying to reorder arbitrary
# earlier transforms. This makes the final production artifact deterministic.
canonical = '''async function initializeApplication() {
  if (state.initialized || state.initializing) {
    return;
  }

  if (
    !state.session ||
    !state.user ||
    !state.staff ||
    !state.currentRole
  ) {
    return;
  }

  state.initializing = true;

  const loginPage = $("loginPage");
  const adminPage = $("adminPage");

  if (loginPage) loginPage.classList.add("hidden");
  if (adminPage) adminPage.classList.remove("hidden");

  // Critical interaction ownership is established before any network work.
  updateUserIdentity();
  bindTabs();
  bindBookingFilters();
  bindLogout();
  bindPatientPage();
  buildCommandCenter();

  // The shell is interactive now. Background work must never gate it.
  state.initialized = true;
  state.initializing = false;

  void loadBookings().catch(error =>
    console.error("Background booking load error:", error)
  );

  if (
    window.AZAAD_STAFF &&
    typeof window.AZAAD_STAFF.init === "function"
  ) {
    Promise.resolve()
      .then(() => window.AZAAD_STAFF.init())
      .catch(error =>
        console.error("Staff management init error:", error)
      );
  }

  showToast(
    `🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`,
    "success"
  );
}
'''

js = js[:start] + canonical + js[end:]

# Ensure the state has the explicit initialization race guard required by the
# canonical contract. Add it only when absent; never duplicate it.
if "initializing: false" not in js:
    js = js.replace(
        "  initialized: false,\n  loadingBookings: false",
        "  initialized: false,\n  loadingBookings: false,\n  initializing: false",
        1,
    )

# Optional post-auth runtimes are not part of the authentication critical path.
runtime_marker = "async function loadAfterAuthRuntimes()"
runtime_bounds = function_bounds(js, runtime_marker)
if runtime_bounds is not None:
    rstart, rend = runtime_bounds
    rbrace = js.find("{", rstart)
    rbody = '''{\n  // DISABLED: optional runtimes must be explicitly loaded by their owning panel.\n  return;\n}\n'''
    js = js[:rstart] + "async function loadAfterAuthRuntimes() " + rbody + js[rend:]

# Fail closed against the exact regressions this canonicalizer owns.
bounds = function_bounds(js, marker)
if bounds is None:
    raise SystemExit("Final initializeApplication() boundary could not be determined")
final_body = js[bounds[0]:bounds[1]]

required = (
    "bindTabs();",
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
print("[AZAAD] Admin critical initialization canonicalized deterministically and verified")