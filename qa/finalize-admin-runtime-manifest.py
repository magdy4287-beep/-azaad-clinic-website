from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
if not ADMIN.exists():
    raise SystemExit("admin.html missing")

text = ADMIN.read_text(encoding="utf-8")
script_re = re.compile(
    r'<script\b([^>]*)>(?:\s*</script>)?\s*',
    re.I | re.S,
)
attr_re = re.compile(
    r'\bdata-azaad-after-auth-src\s*=\s*(["\'])(.*?)\1',
    re.I | re.S,
)

seen = set()
removed = 0

def dedupe(match):
    global removed
    attrs = match.group(1)
    found = attr_re.search(attrs)
    if not found:
        return match.group(0)
    src = found.group(2)
    path = (urlsplit(src).path or src).lstrip("/").lower()
    if path not in seen:
        seen.add(path)
        return match.group(0)
    removed += 1
    return "\n"

text = script_re.sub(dedupe, text)

# The shell is a navigation/runtime manifest entry, not an executable page script.
shell_count = sum(
    1 for src in re.findall(r'data-azaad-after-auth-src=["\']([^"\']+)["\']', text, re.I)
    if (urlsplit(src).path or src).lstrip("/").lower() == "admin-shell.js"
)
if shell_count != 1:
    raise SystemExit(f"canonical Admin shell manifest must exist exactly once; found {shell_count}")

ADMIN.write_text(text, encoding="utf-8")
print(f"[AZAAD runtime manifest] PASS: deduplicated {removed} duplicate post-auth runtime reference(s)")
