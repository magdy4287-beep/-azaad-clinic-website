from pathlib import Path

PATH = Path("admin.js")
if not PATH.is_file():
    raise SystemExit("admin.js is required")

text = PATH.read_text(encoding="utf-8")

INIT = '''async function initializeApplication() {
  if (state.initialized || state.initializing) return;
  if (!state.session || !state.staff || !state.currentRole) return;

  state.initializing = true;
  try {
    if (!state.user?.id && state.staff?.auth_user_id) {
      state.user = { id: state.staff.auth_user_id };
    }

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
    window.dispatchEvent(new CustomEvent("azaad:admin-authenticated"));

    void loadBookings().catch(error => {
      console.error("Background booking load error:", error);
    });

    showToast(`🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`, "success");
  } finally {
    state.initializing = false;
  }
}
'''


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
        elif block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 1
        elif quote:
            if escape: escape = False
            elif ch == "\\": escape = True
            elif ch == quote: quote = None
        elif ch in ("'", '"', "`"):
            quote = ch
        elif ch == "/" and nxt == "/":
            line_comment = True
            i += 1
        elif ch == "/" and nxt == "*":
            block_comment = True
            i += 1
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return start, i + 1
        i += 1
    return None

bounds = function_bounds(text, "async function initializeApplication()")
if bounds:
    text = text[:bounds[0]] + INIT + text[bounds[1]:]
else:
    marker = "window.AZAAD_LOGIN_CONTROLLER_READY = true;"
    if marker in text:
        text = text.replace(marker, INIT + "\n" + marker, 1)
    else:
        text = text.rstrip() + "\n\n" + INIT

if "async function initializeApplication()" not in text:
    raise SystemExit("FAIL-CLOSED: canonical initializeApplication() owner was not installed")

init = function_bounds(text, "async function initializeApplication()")
if not init:
    raise SystemExit("FAIL-CLOSED: initializeApplication() boundary is malformed")
body = text[init[0]:init[1]]

for forbidden in ("supabase.", "window.AZAAD_STAFF.init", "await loadBookings()"):
    if forbidden in body:
        raise SystemExit(f"FAIL-CLOSED: forbidden Admin initialization dependency remains: {forbidden}")

for required in ("bindBookingFilters();", "bindLogout();", "bindPatientPage();", "buildCommandCenter();", "state.initialized = true;", "void loadBookings().catch("):
    if required not in body:
        raise SystemExit(f"FAIL-CLOSED: required Admin initialization contract missing: {required}")

PATH.write_text(text, encoding="utf-8")
print("[AZAAD final Appwrite interactivity] PASS: canonical initializeApplication owner restored after all Admin auth transforms")
