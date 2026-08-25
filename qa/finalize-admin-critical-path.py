from pathlib import Path
import re

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

# Authentication must never wait for application initialization. Idempotent:
# earlier transforms may already have converted some calls.
blocking_pattern = r"\bawait\s+initializeApplication\s*\(\s*\)\s*;"
js, count = re.subn(
    blocking_pattern,
    '''void initializeApplication().catch(error =>
    console.error("Admin initialization error:", error
  ));''',
    js,
)

if re.search(blocking_pattern, js):
    raise SystemExit("Blocking initializeApplication() call remains")

# Locate initializeApplication by balanced braces so earlier transforms can
# change formatting or nearby comments without breaking this finalizer.
marker = "async function initializeApplication()"
init_start = js.find(marker)
if init_start < 0:
    raise SystemExit("initializeApplication() not found")

brace_start = js.find("{", init_start)
if brace_start < 0:
    raise SystemExit("initializeApplication() opening brace not found")

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
load_match = re.search(r"\bawait\s+loadBookings\s*\(\s*\)\s*;", init_body)
if not load_match:
    raise SystemExit("await loadBookings() not found in initializeApplication()")

required = (
    "bindTabs();",
    "bindBookingFilters();",
    "bindLogout();",
    "bindPatientPage();",
    "buildCommandCenter();",
)

before_load = init_body[:load_match.start()]
after_load = init_body[load_match.start():]

# Remove duplicate copies anywhere in initializeApplication, then insert exactly
# one canonical block immediately before booking/data initialization.
for statement in required:
    before_load = re.sub(
        r"(?m)^\s*" + re.escape(statement) + r"\s*$\n?",
        "",
        before_load,
    )
    after_load = re.sub(
        r"(?m)^\s*" + re.escape(statement) + r"\s*$\n?",
        "",
        after_load,
    )

binding_block = """  // Critical UI bindings first: network/data work cannot delay interaction.\n  bindTabs();\n  bindBookingFilters();\n  bindLogout();\n  bindPatientPage();\n  buildCommandCenter();\n\n"""

new_init_body = (
    before_load.rstrip()
    + "\n\n"
    + binding_block
    + after_load.lstrip()
)

js = js[:init_start] + new_init_body + js[init_end:]

# Hard safety boundary: the old post-auth orchestrator was capable of loading
# a large collection of independent scripts after login. That creates a second
# runtime owner and can monopolize the main thread after the shell is visible.
# Keep the registry/function for future explicit, panel-scoped loading, but make
# the automatic orchestrator a no-op in the production canonical artifact.
runtime_marker = "async function loadAfterAuthRuntimes()"
runtime_start = js.find(runtime_marker)
if runtime_start >= 0:
    runtime_brace = js.find("{", runtime_start)
    if runtime_brace < 0:
        raise SystemExit("loadAfterAuthRuntimes() opening brace not found")
    js = (
        js[:runtime_brace + 1]
        + '\n  // DISABLED: optional runtimes must be explicitly loaded by their owning panel.\n  return;\n'
        + js[runtime_brace + 1:]
    )

# Final fail-closed proof.
if re.search(blocking_pattern, js):
    raise SystemExit("Blocking initializeApplication() call remains after finalization")

init_start = js.find(marker)
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

final_body = js[init_start:init_end]
load_pos = final_body.find("await loadBookings();")
if load_pos < 0:
    raise SystemExit("Final Admin initialization has no await loadBookings()")

for statement in required:
    positions = [m.start() for m in re.finditer(re.escape(statement), final_body)]
    if len(positions) != 1 or positions[0] > load_pos:
        raise SystemExit(
            f"Critical Admin binding must appear exactly once before loadBookings(): {statement}"
        )

if runtime_start >= 0:
    runtime_start = js.find(runtime_marker)
    runtime_body = js[runtime_start:]
    if "return;" not in runtime_body.split("{", 1)[1][:120]:
        raise SystemExit("Post-auth runtime orchestrator was not disabled")

path.write_text(js, encoding="utf-8")
print(
    f"[AZAAD] Admin critical path finalized: {count} blocking init call(s) converted; critical UI bindings precede booking initialization; automatic post-auth runtime orchestration disabled"
)
