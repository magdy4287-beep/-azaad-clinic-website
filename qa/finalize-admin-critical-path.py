from pathlib import Path

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

# 1) Authentication must never wait for application initialization.
old = "await initializeApplication();"
new = '''void initializeApplication().catch(error =>
    console.error("Admin initialization error:", error)
  );'''

count = js.count(old)
if count < 1:
    raise SystemExit(
        "No blocking initializeApplication() calls found before finalization"
    )

js = js.replace(old, new)

# 2) The Admin shell must bind its critical interactions BEFORE any data/network
#    initialization. Otherwise a slow/failing booking query can leave Logout and
#    the navigation controls unbound even though the shell is already visible.
old_init = '''  updateUserIdentity();

  await loadBookings();

  bindTabs();

  bindBookingFilters();

  bindLogout();

  bindPatientPage();

  buildCommandCenter();'''

new_init = '''  updateUserIdentity();

  // Critical UI bindings come first. No network/data/module work may delay them.
  bindTabs();

  bindBookingFilters();

  bindLogout();

  bindPatientPage();

  buildCommandCenter();

  // Data initialization is deliberately background work after the shell is usable.
  await loadBookings();'''

if old_init not in js:
    raise SystemExit(
        "Admin initialization ordering contract not found; refusing to guess"
    )

js = js.replace(old_init, new_init, 1)

# Fail closed if a later transform reintroduces blocking initialization or moves
# critical bindings behind the first booking await.
if "await initializeApplication();" in js:
    raise SystemExit("Blocking initializeApplication() call remains")

init_start = js.find("async function initializeApplication()")
if init_start < 0:
    raise SystemExit("initializeApplication() not found")

init_end = js.find("/* ============================================================\n   USER IDENTITY", init_start)
if init_end < 0:
    raise SystemExit("Unable to locate initializeApplication() boundary")

init_body = js[init_start:init_end]
bind_logout_pos = init_body.find("bindLogout();")
load_bookings_pos = init_body.find("await loadBookings();")
if bind_logout_pos < 0 or load_bookings_pos < 0 or bind_logout_pos > load_bookings_pos:
    raise SystemExit(
        "Critical Admin bindings must precede loadBookings()"
    )

path.write_text(js, encoding="utf-8")
print(
    f"[AZAAD] Admin critical path finalized: {count} nonblocking init call(s); UI bindings precede data initialization"
)