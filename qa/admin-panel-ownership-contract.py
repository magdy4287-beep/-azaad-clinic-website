from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / "admin.html").read_text(encoding="utf-8")
adminjs = (ROOT / "admin.js").read_text(encoding="utf-8")
enterprise = (ROOT / "admin-enterprise-centers.js").read_text(encoding="utf-8")
loader = (ROOT / "qa" / "lazy-admin-modules.py").read_text(encoding="utf-8")
shell = (ROOT / "admin-shell.js").read_text(encoding="utf-8")
staff_runtime = (ROOT / "staff-management.js").read_text(encoding="utf-8")

EXPECTED = {
    "bookings": ["patient-appointment-actions.js"],
    "doctors": ["doctors-center-v2.js"],
    "services": ["services-center-v2.js"],
    "schedules": ["scheduling-v2.js"],
    "posts": ["marketing-studio-v3.js"],
    "staff": ["staff-management.js"],
    "calendar": ["admin-calendar-center.js"],
    "holidays": ["admin-enhancements-v1.js"],
    "hours": ["admin-enhancements-v1.js"],
    "settings": ["admin-enhancements-v1.js"],
    "account": ["admin-enhancements-v1.js"],
}

checks = []
def check(name, ok, detail=""):
    checks.append((name, ok, detail))

for panel, owners in EXPECTED.items():
    tabs = len(re.findall(r'data-panel=["\']' + re.escape(panel) + r'["\']', admin))
    if panel == "calendar" and tabs == 0 and 'data-panel="calendar"' in loader:
        tabs = 1
    check(f"{panel}: exactly one tab", tabs == 1, f"found {tabs}")
    for owner in owners:
        check(f"{panel}: owner declared", owner in loader)

for group in re.findall(r'\n\s*"([a-z]+)"\s*:\s*\[', loader):
    if group == "calendar" and 'data-panel="calendar"' in loader:
        continue
    check(f"registry group has UI panel: {group}", bool(re.search(r'data-panel=["\']' + re.escape(group) + r'["\']', admin)))

for obsolete in ["marketing-workspace-v2.js", "marketing-platform-expansion.js", "scheduling-v2-waiting.js"]:
    check(f"superseded module excluded: {obsolete}", obsolete in loader and "LEGACY_OR_CONTRACT" in loader)

check("navigation owner is admin-shell", ".addEventListener('click'" in shell)
check("shell emits panel activation", "azaad:admin-panel-activated" in shell)
check("shell accepts internal panel requests", "azaad:admin-panel-requested" in shell)
check("registry consumes panel activation", "azaad:admin-panel-activated" in loader)
check("registry has no delegated tab click owner", "document.addEventListener('click'" not in loader)
check("admin core has no bindTabs owner", "function bindTabs(" not in adminjs)
check("admin core has no switchPanel owner", "function switchPanel(" not in adminjs)
check("admin core uses request bridge", "azaad:admin-panel-requested" in adminjs)
check("enterprise has no tab click owner", "tab.addEventListener('click'" not in enterprise)
check("enterprise consumes panel activation", "azaad:admin-panel-activated" in enterprise)
check("registry remains sole panel-loader definition", adminjs.count("window.AZAAD_LOAD_ADMIN_PANEL =") == 0 and loader.count("window.AZAAD_LOAD_ADMIN_PANEL =") == 1)

# Security/readiness contract: staff management must be both role-gated and panel-lazy.
check("staff navigation is fail-closed before role resolution", 'body:not([data-role="OWNER"]):not([data-role="ADMIN"]):not([data-role="MANAGER"])' in admin)
check("staff runtime has no DOMContentLoaded auto-initializer", "DOMContentLoaded" not in staff_runtime)
check("staff runtime initializes only from panel activation", "event.detail?.panel === 'staff'" in staff_runtime)
check("staff runtime recognizes canonical currentRole", "window.AZAAD?.state?.currentRole" in staff_runtime)
check("staff mutations send staff_id", "staff_id: button.dataset.staffId" in staff_runtime)

failed = False
for name, ok, detail in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    failed |= not ok

print(f"\nAZAAD panel ownership contract: {len(checks)} checks, {sum(ok for _, ok, _ in checks)} passed, {sum(not ok for _, ok, _ in checks)} failed.")
sys.exit(1 if failed else 0)
