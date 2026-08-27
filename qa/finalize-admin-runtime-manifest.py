from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
ADMIN_JS = Path("admin.js")
if not ADMIN.exists(): raise SystemExit("admin.html missing")
if not ADMIN_JS.exists(): raise SystemExit("admin.js missing")

# Final Admin controller invariant. This runs after every Admin build transform,
# so no later script may reintroduce the optional user-payload gate or a retired
# navigation/session owner.
js = ADMIN_JS.read_text(encoding="utf-8")
js = re.sub(
    r"!state\.session\s*\|\|\s*!state\.user\s*\|\|\s*!state\.staff\s*\|\|\s*!state\.currentRole",
    "!state.session || !state.staff || !state.currentRole",
    js,
    count=1,
)
js = re.sub(r"(?m)^\s*bindTabs\(\);\s*\n?", "", js)
js = re.sub(r"(?m)^\s*switchPanel\([^;]+;\s*\n?", "", js)

for marker in ("function bindTabs()", "function switchPanel(", "async function restoreSession()"):
    if marker in js:
        raise SystemExit(f"Retired Admin symbol remains in final runtime: {marker}")

if re.search(r"\brestoreSession\s*\(", js):
    raise SystemExit("Retired restoreSession invocation remains in final Admin runtime")
if re.search(r"\bbindTabs\s*\(", js):
    raise SystemExit("Retired bindTabs invocation remains in final Admin runtime")
if re.search(r"\bswitchPanel\s*\(", js):
    raise SystemExit("Retired switchPanel invocation remains in final Admin runtime")
if re.search(r"!state\.session\s*\|\|\s*!state\.user\s*\|\|", js):
    raise SystemExit("Optional Supabase user payload is still an Admin shell activation gate")

ADMIN_JS.write_text(js, encoding="utf-8")

text = ADMIN.read_text(encoding="utf-8")
script_re = re.compile(r'<script\b([^>]*)>(?:\s*</script>)?\s*', re.I | re.S)
attr_re = re.compile(r'\bdata-azaad-after-auth-src\s*=\s*(["\'])(.*?)\1', re.I | re.S)
src_re = re.compile(r'(?<![-\w])src\s*=\s*(?:(["\'])(.*?)\1|([^\s>]+))', re.I | re.S)
core_re = re.compile(r'\s*<script\b[^>]*\bsrc=["\'][^"\']*/azaad-core-context\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\s*', re.I)
text = core_re.sub("\n", text)
if "</head>" not in text: raise SystemExit("admin.html has no </head>")
text = text.replace("</head>", '<script src="/azaad-core-context.js?v=1.1.0"></script>\n</head>', 1)

seen = set(); removed = 0
def dedupe(match):
    global removed
    attrs = match.group(1); found = attr_re.search(attrs)
    if not found: return match.group(0)
    src = found.group(2); path = (urlsplit(src).path or src).lstrip("/").lower()
    if path not in seen:
        seen.add(path); return match.group(0)
    removed += 1; return "\n"
text = script_re.sub(dedupe, text)

shell_executable = shell_after_auth = core_executable = core_after_auth = 0
for match in script_re.finditer(text):
    attrs = match.group(1); src_match = src_re.search(attrs); after_match = attr_re.search(attrs)
    if src_match:
        src = src_match.group(2) if src_match.group(2) is not None else src_match.group(3)
        path = (urlsplit(src).path or src).lstrip("/").lower()
        if path == "admin-shell.js": shell_executable += 1
        if path == "azaad-core-context.js": core_executable += 1
    if after_match:
        path = (urlsplit(after_match.group(2)).path or after_match.group(2)).lstrip("/").lower()
        if path == "admin-shell.js": shell_after_auth += 1
        if path == "azaad-core-context.js": core_after_auth += 1

if shell_executable != 1 or shell_after_auth != 0:
    raise SystemExit(f"canonical Admin shell must be exactly one executable pre-auth entry (executable={shell_executable}, after_auth={shell_after_auth})")
if core_executable != 1 or core_after_auth != 0:
    raise SystemExit(f"canonical Cairo core context must be exactly one executable pre-auth entry (executable={core_executable}, after_auth={core_after_auth})")

ADMIN.write_text(text, encoding="utf-8")
print(f"[AZAAD runtime manifest] PASS: final Admin controller invariant + canonical admin-shell/core context; removed {removed} duplicate post-auth references")
