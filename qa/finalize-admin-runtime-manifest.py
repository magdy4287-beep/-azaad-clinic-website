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
src_re = re.compile(
    r'(?<![-\w])src\s*=\s*(?:(["\'])(.*?)\1|([^\s>]+))',
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

# The canonical Admin shell is the pre-auth navigation control plane. It must
# remain executable exactly once; it must never be represented as an
# after-auth-only manifest entry.
shell_executable = 0
shell_after_auth = 0
for match in script_re.finditer(text):
    attrs = match.group(1)
    src_match = src_re.search(attrs)
    after_match = attr_re.search(attrs)
    if src_match:
        src = src_match.group(2) if src_match.group(2) is not None else src_match.group(3)
        path = (urlsplit(src).path or src).lstrip("/").lower()
        if path == "admin-shell.js":
            shell_executable += 1
    if after_match:
        src = after_match.group(2)
        path = (urlsplit(src).path or src).lstrip("/").lower()
        if path == "admin-shell.js":
            shell_after_auth += 1

if shell_executable != 1 or shell_after_auth != 0:
    raise SystemExit(
        "canonical Admin shell must be exactly one executable pre-auth manifest entry "
        f"(executable={shell_executable}, after_auth={shell_after_auth})"
    )

ADMIN.write_text(text, encoding="utf-8")
print(
    "[AZAAD runtime manifest] PASS: deduplicated "
    f"{removed} duplicate post-auth runtime reference(s); canonical admin-shell is executable pre-auth exactly once"
)
