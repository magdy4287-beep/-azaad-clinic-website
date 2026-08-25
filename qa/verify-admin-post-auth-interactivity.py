from pathlib import Path
import re

admin_js = Path("admin.js")
admin_html = Path("admin.html")
if not admin_js.exists() or not admin_html.exists():
    raise SystemExit("Admin interactivity verification requires admin.js and admin.html")

js = admin_js.read_text(encoding="utf-8")
html = admin_html.read_text(encoding="utf-8")


def function_body(source, marker):
    start = source.find(marker)
    if start < 0:
        return None
    brace = source.find("{", start)
    if brace < 0:
        return None
    depth = 0
    for index in range(brace, len(source)):
        char = source[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[brace + 1:index]
    return None


body = function_body(js, "async function initializeApplication()")
if body is None:
    raise SystemExit("initializeApplication() not found or malformed")

# The shell must become interactive before any background data/module work.
required_order = [
    "bindTabs();",
    "bindBookingFilters();",
    "bindLogout();",
    "bindPatientPage();",
    "buildCommandCenter();",
    "state.initialized = true;",
    "loadBookings()",
]
positions = [body.find(token) for token in required_order]
if any(pos < 0 for pos in positions):
    raise SystemExit("Admin critical interaction sequence is incomplete")
if positions != sorted(positions):
    raise SystemExit("Admin network/optional work precedes critical interaction bindings")

if "await loadBookings();" in body:
    raise SystemExit("Admin initialization still awaits bookings on the critical path")
if "await loadAfterAuthRuntimes();" in body:
    raise SystemExit("Admin initialization still awaits optional post-auth runtimes")

# The canonical finalizer disables the legacy automatic orchestrator. If an
# earlier transform has not reached that stage, the verifier also accepts the
# explicitly asynchronous setTimeout handoff produced by fix-admin-post-auth-freeze.
runtime_disabled = "// DISABLED: optional runtimes" in body or "return;" in function_body(js, "async function loadAfterAuthRuntimes()")
runtime_scheduled = bool(re.search(
    r"setTimeout\(\s*\(\)\s*=>\s*\{?\s*Promise\.resolve\(\)\s*\.then\(\(\)\s*=>\s*loadAfterAuthRuntimes\(\)",
    body,
    re.S,
))
if not (runtime_disabled or runtime_scheduled):
    raise SystemExit("Optional post-auth runtimes are not isolated asynchronously")

if "state.initializing = true;" not in body or "state.initializing = false;" not in body:
    raise SystemExit("Initialization race guard is missing")

logout_body = function_body(js, "async function logout()")
if logout_body is None:
    raise SystemExit("logout() not found or malformed")
if "Promise.race([" not in logout_body or "2500" not in logout_body:
    raise SystemExit("Logout is not bounded against a blocked auth request")

if len(re.findall(r'<form\b[^>]*\bid=["\']loginForm["\']', html, re.I)) != 1:
    raise SystemExit("Admin must contain exactly one canonical login form")

print("[AZAAD] admin post-auth interactivity contract: PASS")
