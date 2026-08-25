from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / "admin.html").read_text(encoding="utf-8")
loader = (ROOT / "qa" / "lazy-admin-modules.py").read_text(encoding="utf-8")

# Canonical panel contract. Core-owned panels deliberately have no lazy module.
EXPECTED = {
    "bookings": ("lazy", ["patient-appointment-actions.js"]),
    "doctors": ("lazy", ["doctors-center-v2.js"]),
    "services": ("lazy", ["services-center-v2.js"]),
    "schedules": ("lazy", ["scheduling-v2.js"]),
    "posts": ("lazy", ["marketing-studio-v3.js"]),
    "staff": ("lazy", ["staff-management.js"]),
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
    check(f"{panel}: exactly one tab", tabs == 1, f"found {tabs}")
    for owner in owners:
        check(f"{panel}: owner declared", owner in loader)

# Every runtime lazy group must correspond to an actual Admin panel.
for group in re.findall(r'\n\s*"([a-z]+)"\s*:\s*\[', loader):
    check(f"registry group has UI panel: {group}", bool(re.search(r'data-panel=["\']' + re.escape(group) + r'["\']', admin)))

# Superseded modules must never be registered as runtime owners.
for obsolete in [
    "marketing-workspace-v2.js",
    "marketing-platform-expansion.js",
    "scheduling-v2-waiting.js",
]:
    check(f"superseded module excluded: {obsolete}", obsolete in loader and "LEGACY_OR_CONTRACT" in loader)

failed = False
for name, ok, detail in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    failed |= not ok

print(f"\nAZAAD panel ownership contract: {len(checks)} checks, {sum(ok for _, ok, _ in checks)} passed, {sum(not ok for _, ok, _ in checks)} failed.")
sys.exit(1 if failed else 0)
