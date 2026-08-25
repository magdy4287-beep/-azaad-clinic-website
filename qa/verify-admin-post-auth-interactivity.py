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

required = (
    "bindTabs();",
    "bindBookingFilters();",
    "bindLogout();",
    "bindPatientPage();",
    "buildCommandCenter();",
)

# Find the actual booking invocation rather than assuming a particular spelling
# such as `await loadBookings()`. Earlier transforms intentionally make this
# background work nonblocking.
load_match = re.search(r"\b(?:void\s+)?loadBookings\s*\(", body)
if not load_match:
    raise SystemExit("Background booking initialization call is missing")
load_pos = load_match.start()

positions = []
for statement in required:
    matches = [m.start() for m in re.finditer(re.escape(statement), body)]
    if len(matches) != 1:
        raise SystemExit(
            f"Critical Admin binding must appear exactly once: {statement}"
        )
    if matches[0] >= load_pos:
        raise SystemExit(
            f"Admin network/optional work precedes critical interaction binding: {statement}"
        )
    positions.append(matches[0])

if "state.initialized = true;" not in body:
    raise SystemExit("Admin shell is not marked interactive before background work")
if body.find("state.initialized = true;") >= load_pos:
    raise SystemExit("Admin shell is marked initialized only after background booking work")

if "await loadBookings();" in body:
    raise SystemExit("Admin initialization still awaits bookings on the critical path")
if "await loadAfterAuthRuntimes();" in body:
    raise SystemExit("Admin initialization still awaits optional post-auth runtimes")

runtime_body = function_body(js, "async function loadAfterAuthRuntimes()")
runtime_disabled = runtime_body is not None and "return;" in runtime_body[:240]
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
