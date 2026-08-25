from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / "admin.html").read_text(encoding="utf-8")
loader = (ROOT / "qa" / "lazy-admin-modules.py").read_text(encoding="utf-8")
shell = (ROOT / "admin-shell.js").read_text(encoding="utf-8")

EXPECTED = {
    "bookings": ("lazy", ["patient-appointment-actions.js"]),
    "doctors": ("lazy", ["doctors-center-v2.js"]),
    "services": ("lazy", ["services-center-v2.js"]),
    "schedules": ("lazy", ["scheduling-v2.js"]),
    "posts": ("lazy", ["marketing-studio-v3.js"]),
    "staff": ("lazy", ["staff-management.js"]),
    "calendar": ("lazy", ["admin-calendar-center.js"]),
    "holidays": ("core", ["admin-enhancements-v1.js"]),
    "hours": ("core", ["admin-enhancements-v1.js"]),
    "settings": ("core", ["admin-enhancements-v1.js"]),
    "account": ("core", ["admin-enhancements-v1.js"]),
}

checks = []
def check(name, ok, detail=""):
    checks.append((name, ok, detail))

for panel, (kind, owners) in EXPECTED.items():
    tabs = len(re.findall(r'data-panel=["\']' + re.escape(panel) + r'["\']', admin))
    if panel == "calendar" and tabs == 0 and 'data-panel="calendar"' in loader:
        tabs = 1
    check(f"{panel}: exactly one tab", tabs == 1, f"found {tabs}")
    for owner in owners:
        check(f"{panel}: owner declared", owner in loader)

for group in re.findall(r'\n\s*"([a-z]+)"\s*:\s*\[', loader):
    if group == "calendar" and 'data-panel="calendar"' in loader:
        continue
    check(
        f"registry group has UI panel: {group}",
        bool(re.search(r'data-panel=["\']' + re.escape(group) + r'["\']', admin)),
    )

for obsolete in [
    "marketing-workspace-v2.js",
    "marketing-platform-expansion.js",
    "scheduling-v2-waiting.js",
]:
    check(f"superseded module excluded: {obsolete}", obsolete in loader and "LEGACY_OR_CONTRACT" in loader)

# Navigation has exactly one owner: admin-shell.js.
# The lazy registry owns loading only and must react to the shell's activation event.
check("navigation owner is admin-shell", "document.addEventListener('click'" in shell)
check("shell emits panel activation", "azaad:admin-panel-activated" in shell)
check("registry consumes panel activation", "azaad:admin-panel-activated" in loader)
check("registry has no delegated tab click owner", "document.addEventListener('click'" not in loader)
check("registry remains sole panel-loader definition", loader.count("window.AZAAD_LOAD_ADMIN_PANEL =") == 1)

failed = False
for name, ok, detail in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    failed |= not ok

print(f"\nAZAAD panel ownership contract: {len(checks)} checks, {sum(ok for _, ok, _ in checks)} passed, {sum(not ok for _, ok, _ in checks)} failed.")
sys.exit(1 if failed else 0)
