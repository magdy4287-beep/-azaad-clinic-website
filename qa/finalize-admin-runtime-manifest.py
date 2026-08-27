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

# The Cairo business-date context is a required pre-auth application dependency.
# Keep exactly one executable copy in the Admin document and never classify it as
# an after-auth feature runtime.
core_re = re.compile(
    r'\s*<script\b[^>]*\bsrc=["\'][^"\']*/azaad-core-context\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\s*',
    re.I,
)
text = core_re.sub("\n", text)
if "</head>" not in text:
    raise SystemExit("admin.html has no </head>")
text = text.replace(
    "</head>",
    '<script src="/azaad-core-context.js?v=1.1.0"></script>\n</head>',
    1,
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

shell_executable = 0
shell_after_auth = 0
core_executable = 0
core_after_auth = 0
for match in script_re.finditer(text):
    attrs = match.group(1)
    src_match = src_re.search(attrs)
    after_match = attr_re.search(attrs)
    if src_match:
        src = src_match.group(2) if src_match.group(2) is not None else src_match.group(3)
        path = (urlsplit(src).path or src).lstrip("/").lower()
        if path == "admin-shell.js":
            shell_executable += 1
        if path == "azaad-core-context.js":
            core_executable += 1
    if after_match:
        src = after_match.group(2)
        path = (urlsplit(src).path or src).lstrip("/").lower()
        if path == "admin-shell.js":
            shell_after_auth += 1
        if path == "azaad-core-context.js":
            core_after_auth += 1

if shell_executable != 1 or shell_after_auth != 0:
    raise SystemExit(
        "canonical Admin shell must be exactly one executable pre-auth manifest entry "
        f"(executable={shell_executable}, after_auth={shell_after_auth})"
    )
if core_executable != 1 or core_after_auth != 0:
    raise SystemExit(
        "canonical Cairo core context must be exactly one executable pre-auth entry "
        f"(executable={core_executable}, after_auth={core_after_auth})"
    )

ADMIN.write_text(text, encoding="utf-8")
print(
    "[AZAAD runtime manifest] PASS: deduplicated "
    f"{removed} duplicate post-auth runtime reference(s); canonical admin-shell and Cairo core context are executable pre-auth exactly once"
)
