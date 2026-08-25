from pathlib import Path

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

blocking = "await initializeApplication();"
if blocking in js:
    raise SystemExit("Admin auth still contains a blocking initializeApplication() call")

scheduled = "void initializeApplication().catch("
if js.count(scheduled) != 2:
    raise SystemExit(
        f"Expected exactly 2 nonblocking initialization schedules, found {js.count(scheduled)}"
    )

init_start = js.find("async function initializeApplication()")
if init_start < 0:
    raise SystemExit("initializeApplication() not found")

init_end = js.find("/* ============================================================\n   USER IDENTITY", init_start)
if init_end < 0:
    raise SystemExit("Unable to locate initializeApplication() boundary")

init_body = js[init_start:init_end]
load_pos = init_body.find("await loadBookings();")
logout_pos = init_body.find("bindLogout();")
tabs_pos = init_body.find("bindTabs();")
filters_pos = init_body.find("bindBookingFilters();")
patient_pos = init_body.find("bindPatientPage();")

positions = [
    ("bindTabs", tabs_pos),
    ("bindBookingFilters", filters_pos),
    ("bindLogout", logout_pos),
    ("bindPatientPage", patient_pos),
]

if load_pos < 0:
    raise SystemExit("initializeApplication() must contain loadBookings()")

for name, pos in positions:
    if pos < 0:
        raise SystemExit(f"{name}() binding missing from initializeApplication()")
    if pos > load_pos:
        raise SystemExit(
            f"{name}() must be bound before loadBookings() so data/network work cannot block Admin interaction"
        )

print("[AZAAD] Admin auth critical-path + interaction-order contract: PASS")
