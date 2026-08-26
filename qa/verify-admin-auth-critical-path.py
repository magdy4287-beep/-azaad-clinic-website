from pathlib import Path
import re

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

marker = "async function initializeApplication()"
init_start = js.find(marker)
if init_start < 0:
    raise SystemExit("initializeApplication() not found")

brace_start = js.find("{", init_start)
depth = 0
init_end = None
for i in range(brace_start, len(js)):
    if js[i] == "{":
        depth += 1
    elif js[i] == "}":
        depth -= 1
        if depth == 0:
            init_end = i + 1
            break
if init_end is None:
    raise SystemExit("initializeApplication() boundary could not be determined")

init_body = js[init_start:init_end]

load_calls = re.findall(r"(?:void\s+)?loadBookings\s*\(\s*\)", init_body)
if len(load_calls) != 1:
    raise SystemExit("initializeApplication() must contain exactly one loadBookings() start")
if re.search(r"await\s+loadBookings\s*\(\s*\)", init_body):
    raise SystemExit("initializeApplication() must not await loadBookings()")
if "void loadBookings().catch(" not in init_body:
    raise SystemExit("loadBookings() must be explicitly background/nonblocking")

# Navigation is owned exclusively by admin-shell.js. The Admin core critical path
# therefore verifies only bindings owned by admin.js; bindTabs() is intentionally
# forbidden rather than required.
load_pos = init_body.find("loadBookings()")
for name in (
    "bindBookingFilters();",
    "bindLogout();",
    "bindPatientPage();",
    "buildCommandCenter();",
):
    positions = [m.start() for m in re.finditer(re.escape(name), init_body)]
    if len(positions) != 1:
        raise SystemExit(f"{name} must appear exactly once in initializeApplication()")
    if positions[0] > load_pos:
        raise SystemExit(f"{name}() must be bound before background loadBookings()")

if "function bindTabs()" in js or "function switchPanel(" in js:
    raise SystemExit("Retired duplicate navigation owner remains in admin.js")

state_true = init_body.find("state.initialized = true;")
state_false = init_body.find("state.initializing = false;")
if state_true < 0 or state_false < 0 or state_true > load_pos or state_false > load_pos:
    raise SystemExit("Admin interactive state must be established before background data work")

if "await window.AZAAD_STAFF.init" in init_body:
    raise SystemExit("Optional staff runtime is still awaited by Admin initialization")

runtime_marker = "async function loadAfterAuthRuntimes()"
runtime_start = js.find(runtime_marker)
if runtime_start >= 0:
    runtime_brace = js.find("{", runtime_start)
    runtime_head = js[runtime_brace + 1:runtime_brace + 220]
    if "return;" not in runtime_head:
        raise SystemExit("Automatic post-auth runtime orchestrator is not disabled")

print("[AZAAD] Admin auth critical-path + shell-owned navigation + interaction-order + nonblocking-data contract: PASS")
