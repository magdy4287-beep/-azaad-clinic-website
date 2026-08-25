from pathlib import Path
import re

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

if re.search(r"\bawait\s+initializeApplication\s*\(\s*\)\s*;", js):
    raise SystemExit("Admin auth still contains a blocking initializeApplication() call")

scheduled = re.findall(r"void\s+initializeApplication\s*\(\)\s*\.catch\(", js)
if not scheduled:
    raise SystemExit("No nonblocking initializeApplication schedule found")

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
load_pos = init_body.find("await loadBookings();")
if load_pos < 0:
    raise SystemExit("initializeApplication() must contain loadBookings()")

for name in (
    "bindTabs();",
    "bindBookingFilters();",
    "bindLogout();",
    "bindPatientPage();",
    "buildCommandCenter();",
):
    positions = [m.start() for m in re.finditer(re.escape(name), init_body)]
    if len(positions) != 1:
        raise SystemExit(f"{name} must appear exactly once in initializeApplication()")
    if positions[0] > load_pos:
        raise SystemExit(
            f"{name}() must be bound before loadBookings() so data/network work cannot block Admin interaction"
        )

# The legacy post-auth orchestrator loaded many independent scripts 1.5s after
# login. It is a second runtime owner and can monopolize the main thread. The
# canonical production artifact must keep it disabled until explicit panel-scoped
# loading is implemented.
runtime_marker = "async function loadAfterAuthRuntimes()"
runtime_start = js.find(runtime_marker)
if runtime_start >= 0:
    runtime_brace = js.find("{", runtime_start)
    runtime_head = js[runtime_brace + 1:runtime_brace + 180]
    if "return;" not in runtime_head:
        raise SystemExit("Automatic post-auth runtime orchestrator is not disabled")

print("[AZAAD] Admin auth critical-path + interaction-order + runtime-isolation contract: PASS")
