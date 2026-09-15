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
quote = None
escape = False
line_comment = False
block_comment = False
for i in range(brace_start, len(js)):
    ch = js[i]
    nxt = js[i + 1] if i + 1 < len(js) else ""
    if line_comment:
        if ch == "\n":
            line_comment = False
    elif block_comment:
        if ch == "*" and nxt == "/":
            block_comment = False
    elif quote:
        if escape:
            escape = False
        elif ch == "\\":
            escape = True
        elif ch == quote:
            quote = None
    elif ch in ("'", '"', "`"):
        quote = ch
    elif ch == "/" and nxt == "/":
        line_comment = True
    elif ch == "/" and nxt == "*":
        block_comment = True
    elif ch == "{":
        depth += 1
    elif ch == "}":
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
if state_true < 0 or state_true > load_pos:
    raise SystemExit("Admin interactive state must be established before background data work")

# state.initializing is intentionally cleared by the finally block after the
# background booking request is started. Requiring it to be false before that
# request would contradict the canonical fail-safe lifecycle.
if "state.initializing = false;" not in init_body:
    raise SystemExit("Admin initialization must clear state.initializing in its finally path")

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
