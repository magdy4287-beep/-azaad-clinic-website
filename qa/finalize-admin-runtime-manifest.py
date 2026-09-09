from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
ADMIN_JS = Path("admin.js")
if not ADMIN.exists():
    raise SystemExit("admin.html missing")
if not ADMIN_JS.exists():
    raise SystemExit("admin.js missing")

js = ADMIN_JS.read_text(encoding="utf-8")

# This transform owns only the structural Admin runtime manifest. Authentication
# ownership belongs exclusively to finalize-appwrite-admin-auth.py. Keeping auth
# mutation out of this transform prevents the old Supabase controller from being
# reintroduced and then patched again later in the canonical build chain.
for marker in ("function bindTabs()", "function switchPanel("):
    if marker in js:
        raise SystemExit(f"Retired Admin symbol remains in runtime source: {marker}")
for symbol in (r"\bbindTabs\s*\(", r"\bswitchPanel\s*\("):
    if re.search(symbol, js):
        raise SystemExit(f"Retired Admin invocation remains in runtime source: {symbol}")

js = re.sub(r"(?m)^\s*bindTabs\(\);\s*\n?", "", js)
js = re.sub(r"(?m)^\s*switchPanel\([^;]+;\s*\n?", "", js)
ADMIN_JS.write_text(js, encoding="utf-8")

text = ADMIN.read_text(encoding="utf-8")
script_re = re.compile(r'<script\b([^>]*)>(?:\s*</script>)?\s*', re.I | re.S)
attr_re = re.compile(r'\bdata-azaad-after-auth-src\s*=\s*(["\'])(.*?)\1', re.I | re.S)
src_re = re.compile(r'(?<![-\w])src\s*=\s*(?:(["\'])(.*?)\1|([^\s>]+))', re.I | re.S)
core_re = re.compile(
    r'\s*<script\b[^>]*\bsrc=["\'][^"\']*/azaad-core-context\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\s*',
    re.I,
)
if "</head>" not in text:
    raise SystemExit("admin.html has no </head>")
text = core_re.sub("\n", text)
text = text.replace('</head>', '<script src="/azaad-core-context.js?v=1.1.0"></script>\n</head>', 1)

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

shell_executable = shell_after_auth = core_executable = core_after_auth = 0
for match in script_re.finditer(text):
    attrs = match.group(1)
    sm = src_re.search(attrs)
    am = attr_re.search(attrs)
    if sm:
        src = sm.group(2) if sm.group(2) is not None else sm.group(3)
        path = (urlsplit(src).path or src).lstrip("/").lower()
        if path == "admin-shell.js":
            shell_executable += 1
        if path == "azaad-core-context.js":
            core_executable += 1
    if am:
        path = (urlsplit(am.group(2)).path or am.group(2)).lstrip("/").lower()
        if path == "admin-shell.js":
            shell_after_auth += 1
        if path == "azaad-core-context.js":
            core_after_auth += 1

if shell_executable != 1 or shell_after_auth != 0:
    raise SystemExit(
        f"canonical Admin shell must be exactly one executable pre-auth entry "
        f"(executable={shell_executable}, after_auth={shell_after_auth})"
    )
if core_executable != 1 or core_after_auth != 0:
    raise SystemExit(
        f"canonical Cairo core context must be exactly one executable pre-auth entry "
        f"(executable={core_executable}, after_auth={core_after_auth})"
    )

ADMIN.write_text(text, encoding="utf-8")
print(
    f"[AZAAD runtime manifest] PASS: structural manifest only; auth ownership delegated to Appwrite canonical auth; removed {removed} duplicate post-auth references"
)
