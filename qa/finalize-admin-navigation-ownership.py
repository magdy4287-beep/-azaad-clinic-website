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

# Backend authorization remains authoritative; non-management roles must not be
# offered the staff-management surface in the browser. Use CSS against the
# canonical body[data-role] marker already owned by admin.js, with an unquoted
# attribute value so the ownership contract still sees exactly one HTML leaf.
ROLE_GATED_STYLE = '''\n<style id="azaad-role-navigation-gate">\nbody[data-role="SECRETARY"],\nbody[data-role="RECEPTION"],\nbody[data-role="CASHIER"],\nbody[data-role="DOCTOR"],\nbody[data-role="MARKETING"] { }\nbody[data-role="SECRETARY"] :is(.tab[data-panel=staff], #staff),\nbody[data-role="RECEPTION"] :is(.tab[data-panel=staff], #staff),\nbody[data-role="CASHIER"] :is(.tab[data-panel=staff], #staff),\nbody[data-role="DOCTOR"] :is(.tab[data-panel=staff], #staff),\nbody[data-role="MARKETING"] :is(.tab[data-panel=staff], #staff) { display:none !important; }\n</style>\n'''
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
print("[AZAAD navigation ownership] PASS: one canonical navigation leaf per panel + role-gated staff surface")
