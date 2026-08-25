from pathlib import Path
import re

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

# Authentication must never wait for application initialization. This transform
# is intentionally idempotent because earlier canonical transforms may already
# have converted one or more calls.
blocking = "await initializeApplication();"
new = '''void initializeApplication().catch(error =>
    console.error("Admin initialization error:", error
  ));'''

count = js.count(blocking)
if count:
    js = js.replace(blocking, new)

if blocking in js:
    raise SystemExit("Blocking initializeApplication() call remains")

# Locate initializeApplication without depending on exact whitespace emitted by
# earlier transforms. We only mutate this function body; no other function is
# guessed or rewritten.
init_start = js.find("async function initializeApplication()")
if init_start < 0:
    raise SystemExit("initializeApplication() not found")

init_end = js.find("/* ============================================================\n   USER IDENTITY", init_start)
if init_end < 0:
    raise SystemExit("Unable to locate initializeApplication() boundary")

init_body = js[init_start:init_end]

# Critical UI bindings must happen before the first booking/data await. Remove
# any existing copies from the initialization body and insert one canonical
# block immediately before await loadBookings().
required = [
    "bindTabs();",
    "bindBookingFilters();",
    "bindLogout();",
    "bindPatientPage();",
    "buildCommandCenter();",
]

load_match = re.search(r"\bawait\s+loadBookings\s*\(\s*\)\s*;", init_body)
if not load_match:
    raise SystemExit("await loadBookings() not found in initializeApplication()")

before_load = init_body[:load_match.start()]
after_load = init_body[load_match.start():]

# Remove only the known critical binding statements from the initialization
# function, preserving every other statement and its relative order.
for statement in required:
    before_load = re.sub(r"(?m)^\s*" + re.escape(statement) + r"\s*\n?", "", before_load)
    after_load = re.sub(r"(?m)^\s*" + re.escape(statement) + r"\s*\n?", "", after_load)

binding_block = """  // Critical UI bindings first: no network/data/module work may delay interaction.\n  bindTabs();\n  bindBookingFilters();\n  bindLogout();\n  bindPatientPage();\n  buildCommandCenter();\n\n"""

# Preserve the indentation/style of the existing body while making the ordering
# explicit and deterministic.
new_init_body = before_load.rstrip() + "\n\n" + binding_block + after_load.lstrip()
js = js[:init_start] + new_init_body + js[init_end:]

# Final fail-closed proof.
if blocking in js:
    raise SystemExit("Blocking initializeApplication() call remains after finalization")

init_start = js.find("async function initializeApplication()")
init_end = js.find("/* ============================================================\n   USER IDENTITY", init_start)
init_body = js[init_start:init_end]
load_pos = init_body.find("await loadBookings();")
if load_pos < 0:
    raise SystemExit("Final Admin initialization has no await loadBookings()")

for statement in required:
    if init_body.find(statement) < 0 or init_body.find(statement) > load_pos:
        raise SystemExit(
            f"Critical Admin binding must precede loadBookings(): {statement}"
        )

path.write_text(js, encoding="utf-8")
print(
    f"[AZAAD] Admin critical path finalized: {count} blocking init call(s) converted; critical UI bindings precede booking initialization"
)
