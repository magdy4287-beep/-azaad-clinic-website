from pathlib import Path
import re

path = Path("admin.html")
if not path.exists():
    raise SystemExit("admin.html not found")

text = path.read_text(encoding="utf-8")

PANELS = ("bookings", "doctors", "services", "schedules", "posts", "staff", "calendar", "holidays", "hours", "settings", "account")

for panel in PANELS:
    pattern = re.compile(
        r'<button\b(?=[^>]*\bdata-panel=["\']' + re.escape(panel) + r'["\'])[^>]*>.*?</button>',
        re.I | re.S,
    )
    matches = list(pattern.finditer(text))
    if len(matches) <= 1:
        continue
    for match in reversed(matches[1:]):
        text = text[:match.start()] + text[match.end():]

# Backend authorization remains authoritative. The staff-management surface is
# fail-closed until a management role is positively established by admin.js.
# This prevents pre-auth/runtime races from ever invoking /api/staff-admin.
ROLE_GATED_STYLE = '''\n<style id="azaad-role-navigation-gate">\nbody:not([data-role="OWNER"]):not([data-role="ADMIN"]):not([data-role="MANAGER"]) :is(.tab[data-panel=staff], #staff) { display:none !important; }\n</style>\n'''
if 'id="azaad-role-navigation-gate"' in text:
    text = re.sub(r'\n?<style id="azaad-role-navigation-gate">.*?</style>\n?', '\n', text, count=1, flags=re.I | re.S)
marker = re.search(r'</head>', text, re.I)
if not marker:
    raise SystemExit("admin.html </head> not found")
text = text[:marker.start()] + ROLE_GATED_STYLE + text[marker.start():]

for panel in PANELS:
    count = len(re.findall(r'<button\b(?=[^>]*\bdata-panel=["\']' + re.escape(panel) + r'["\'])', text, re.I))
    if count != 1:
        raise SystemExit(f"{panel}: canonical navigation ownership unresolved; found {count} button(s)")

if 'id="azaad-role-navigation-gate"' not in text:
    raise SystemExit("Role navigation gate missing")

path.write_text(text, encoding="utf-8")
print("[AZAAD navigation ownership] PASS: one canonical navigation leaf per panel + fail-closed role-gated staff surface")
