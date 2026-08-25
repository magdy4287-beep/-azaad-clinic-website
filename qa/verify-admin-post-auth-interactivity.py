from pathlib import Path
import re

admin_js = Path("admin.js")
admin_html = Path("admin.html")
if not admin_js.exists() or not admin_html.exists():
    raise SystemExit("Admin interactivity verification requires admin.js and admin.html")

js = admin_js.read_text(encoding="utf-8")
html = admin_html.read_text(encoding="utf-8")

init = re.search(
    r"async function initializeApplication\(\)\s*\{(?P<body>.*?)\n\}",
    js,
    re.S,
)
if not init:
    raise SystemExit("initializeApplication() not found")

body = init.group("body")

# The shell must become interactive before any background data/module work.
required_order = [
    "bindTabs();",
    "bindBookingFilters();",
    "bindLogout();",
    "bindPatientPage();",
    "buildCommandCenter();",
    "state.initialized = true;",
    "void loadBookings().catch(",
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
if not re.search(r"setTimeout\(\(\)\s*=>\s*\{?\s*Promise\.resolve\(\)\s*\.then\(\(\)\s*=>\s*loadAfterAuthRuntimes\(\)", body, re.S):
    raise SystemExit("Optional post-auth runtimes are not scheduled asynchronously")
if "state.initializing = true;" not in body or "state.initializing = false;" not in body:
    raise SystemExit("Initialization race guard is missing")

logout = re.search(r"async function logout\(\)\s*\{(?P<body>.*?)\n\}", js, re.S)
if not logout:
    raise SystemExit("logout() not found")
logout_body = logout.group("body")
if "Promise.race([" not in logout_body or "2500" not in logout_body:
    raise SystemExit("Logout is not bounded against a blocked auth request")

if len(re.findall(r'<form\b[^>]*\bid=["\']loginForm["\']', html, re.I)) != 1:
    raise SystemExit("Admin must contain exactly one canonical login form")

print("[AZAAD] admin post-auth interactivity contract: PASS")
