from pathlib import Path
import re

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

# Authentication must never await application initialization. Earlier transforms
# may already have converted this call; keep the operation idempotent.
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

# The earlier freeze fix intentionally changes `await loadBookings()` into a
# nonblocking `void loadBookings().catch(...)`. Accept either form. The final
# gate must validate the critical UI boundary, not require one implementation
# detail that an earlier canonical transform has already removed.
load_patterns = (
    r"\bawait\s+loadBookings\s*\(\s*\)\s*;",
    r"\bvoid\s+loadBookings\s*\(\s*\)",
    r"\bloadBookings\s*\(\s*\)",
)
load_match = None
for pattern in load_patterns:
    load_match = re.search(pattern, init_body)
    if load_match:
        break

required = (
    "bindTabs();",
    "bindBookingFilters();",
    "bindLogout();",
    "bindPatientPage();",
    "buildCommandCenter();",
)

if load_match:
    before_load = init_body[:load_match.start()]
    after_load = init_body[load_match.start():]

    # Remove duplicate copies anywhere in initializeApplication, then insert
    # exactly one canonical block before background booking initialization.
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
else:
    # A prior canonical transform may have fully removed booking initialization.
    # That is valid: verify that the critical bindings are already present rather
    # than manufacturing a synthetic loadBookings contract.
    init_body = js[init_start:init_end]
    if not all(statement in init_body for statement in required):
        raise SystemExit(
            "Admin initialization contains no booking load and is missing required critical UI bindings"
        )

# Disable the legacy automatic post-auth orchestrator. Optional runtimes must be
# explicitly loaded by their owning panel so they can never monopolize the main
# thread immediately after authentication.
runtime_marker = "async function loadAfterAuthRuntimes()"
runtime_start = js.find(runtime_marker)
if runtime_start >= 0:
    runtime_brace = js.find("{", runtime_start)
    if runtime_brace < 0:
        raise SystemExit("loadAfterAuthRuntimes() opening brace not found")
    body_start = runtime_brace + 1
    # Replace only the beginning of the function body; preserve the registry and
    # function structure after the early return for future explicit callers.
    if "// DISABLED: optional runtimes" not in js[body_start:body_start + 180]:
        js = (
            js[:body_start]
            + '\n  // DISABLED: optional runtimes must be explicitly loaded by their owning panel.\n  return;\n'
            + js[body_start:]
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

if init_end is None:
    raise SystemExit("Final Admin initialization boundary could not be determined")

final_body = js[init_start:init_end]
for statement in required:
    positions = [m.start() for m in re.finditer(re.escape(statement), final_body)]
    if len(positions) != 1:
        raise SystemExit(
            f"Critical Admin binding must appear exactly once: {statement}"
        )

if runtime_start >= 0:
    runtime_start = js.find(runtime_marker)
    runtime_brace = js.find("{", runtime_start)
    runtime_prefix = js[runtime_brace + 1:runtime_brace + 220]
    if "return;" not in runtime_prefix:
        raise SystemExit("Post-auth runtime orchestrator was not disabled")

path.write_text(js, encoding="utf-8")
print(
    f"[AZAAD] Admin critical path finalized: {count} blocking init call(s) converted; critical UI bindings verified exactly once; nonblocking booking initialization accepted; automatic post-auth runtime orchestration disabled"
)
