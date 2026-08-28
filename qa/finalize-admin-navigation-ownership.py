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

# Fail closed: do not silently ship a duplicate canonical owner.
for panel in PANELS:
    count = len(re.findall(r'<button\b(?=[^>]*\bdata-panel=["\']' + re.escape(panel) + r'["\'])', text, re.I))
    if count != 1:
        raise SystemExit(f"{panel}: canonical navigation ownership unresolved; found {count} button(s)")

path.write_text(text, encoding="utf-8")
print("[AZAAD navigation ownership] PASS: one canonical navigation leaf per panel")
