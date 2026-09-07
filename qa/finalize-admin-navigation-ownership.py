from pathlib import Path
import re

path = Path("admin.html")
if not path.exists(): raise SystemExit("admin.html not found")
text = path.read_text(encoding="utf-8")
PANELS = ("bookings", "doctors", "services", "schedules", "posts", "staff", "calendar", "holidays", "hours", "settings", "account")

# Normalize duplicate navigation leaves first.
for panel in PANELS:
    pattern = re.compile(r'<button\b(?=[^>]*\bdata-panel=["\']' + re.escape(panel) + r'["\'])[^>]*>.*?</button>', re.I | re.S)
    matches = list(pattern.finditer(text))
    for match in reversed(matches[1:]): text = text[:match.start()] + text[match.end():]

# Calendar is a canonical lazy module, so its navigation leaf must be created
# here when upstream HTML transforms did not materialize it.
calendar_buttons = re.findall(r'<button\b(?=[^>]*\bdata-panel=["\']calendar["\'])[^>]*>.*?</button>', text, re.I | re.S)
if not calendar_buttons:
    button = '<button class="tab" data-panel="calendar" type="button">🗓️ التقويم</button>\n'
    tabs = re.search(r'<div\b[^>]*class=["\'][^"\']*\btabs\b[^"\']*["\'][^>]*>', text, re.I)
    if not tabs: raise SystemExit("Admin tabs container not found")
    close = text.find('</div>', tabs.end())
    if close < 0: raise SystemExit("Admin tabs container closing element not found")
    text = text[:close] + button + text[close:]

ROLE_GATED_STYLE = '''\n<style id="azaad-role-navigation-gate">\nbody:not([data-role="OWNER"]):not([data-role="ADMIN"]):not([data-role="MANAGER"]) :is(.tab[data-panel=staff], #staff) { display:none !important; }\n</style>\n'''
text = re.sub(r'\n?<style id="azaad-role-navigation-gate">.*?</style>\n?', '\n', text, count=1, flags=re.I | re.S)
marker = re.search(r'</head>', text, re.I)
if not marker: raise SystemExit("admin.html </head> not found")
text = text[:marker.start()] + ROLE_GATED_STYLE + text[marker.start():]

for panel in PANELS:
    count = len(re.findall(r'<button\b(?=[^>]*\bdata-panel=["\']' + re.escape(panel) + r'["\'])', text, re.I))
    if count != 1: raise SystemExit(f"{panel}: canonical navigation ownership unresolved; found {count} button(s)")
if 'id="azaad-role-navigation-gate"' not in text: raise SystemExit("Role navigation gate missing")
path.write_text(text, encoding="utf-8")
print("[AZAAD navigation ownership] PASS: one canonical navigation leaf per panel + fail-closed role-gated staff surface")
