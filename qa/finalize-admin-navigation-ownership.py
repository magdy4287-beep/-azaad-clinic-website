from pathlib import Path
import re

path = Path("admin.html")
if not path.exists():
    raise SystemExit("admin.html not found")

text = path.read_text(encoding="utf-8")

# The release artifact is the final authority. Earlier transforms may start from
# different historical navigation shapes, so enforce the invariant after all
# navigation-generating transforms have completed: one navigation leaf per
# canonical panel. This is deliberately narrow and only removes duplicate
# navigation buttons; panel content and its internal filters are untouched.
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

# Role-gated navigation: the backend already denies staff-management mutations
# to non-management roles. The UI must not expose that panel to those roles,
# otherwise a secretary/reception/doctor/cashier/marketing session generates
# expected 401s during a "visit every accessible panel" certification. CSS is
# used because the canonical Admin controller already owns body[data-role] and
# this adds no competing JavaScript navigation owner. Keep the canonical
# data-panel="staff" selector unique so the panel-ownership gate still counts
# exactly one navigation leaf.
ROLE_GATED_STYLE = '''\n<style id="azaad-role-navigation-gate">\nbody[data-role="SECRETARY"],\nbody[data-role="RECEPTION"],\nbody[data-role="CASHIER"],\nbody[data-role="DOCTOR"],\nbody[data-role="MARKETING"] { }\nbody[data-role="SECRETARY"] :is(.tab[data-panel="staff"], #staff),\nbody[data-role="RECEPTION"] :is(.tab[data-panel="staff"], #staff),\nbody[data-role="CASHIER"] :is(.tab[data-panel="staff"], #staff),\nbody[data-role="DOCTOR"] :is(.tab[data-panel="staff"], #staff),\nbody[data-role="MARKETING"] :is(.tab[data-panel="staff"], #staff) { display:none !important; }\n</style>\n'''
if 'id="azaad-role-navigation-gate"' in text:
    text = re.sub(r'\n?<style id="azaad-role-navigation-gate">.*?</style>\n?', '\n', text, count=1, flags=re.I | re.S)
marker = re.search(r'</head>', text, re.I)
if not marker:
    raise SystemExit("admin.html </head> not found")
text = text[:marker.start()] + ROLE_GATED_STYLE + text[marker.start():]

# Fail closed: do not silently ship a duplicate canonical owner.
for panel in PANELS:
    count = len(re.findall(r'<button\b(?=[^>]*\bdata-panel=["\']' + re.escape(panel) + r'["\'])', text, re.I))
    if count != 1:
        raise SystemExit(f"{panel}: canonical navigation ownership unresolved; found {count} button(s)")

if 'id="azaad-role-navigation-gate"' not in text:
    raise SystemExit("Role navigation gate missing")
if text.count('data-panel="staff"') != 1 and text.count("data-panel='staff'") != 1:
    raise SystemExit("Role navigation gate must not duplicate the canonical staff data-panel selector")

path.write_text(text, encoding="utf-8")
print("[AZAAD navigation ownership] PASS: one canonical navigation leaf per panel + role-gated staff surface")
