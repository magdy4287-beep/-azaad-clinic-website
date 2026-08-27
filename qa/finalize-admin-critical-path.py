from pathlib import Path
import re

PATH = Path("admin.js")
if not PATH.exists():
    raise SystemExit("admin.js not found")
js = PATH.read_text(encoding="utf-8")

def bounds(source: str, marker: str):
    start = source.find(marker)
    if start < 0:
        return None
    brace = source.find("{", start)
    if brace < 0:
        return None
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch in "'\"`":
            quote = ch
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return (start, i + 1)
        i += 1
    return None

if not bounds(js, "async function login()"):
    raise SystemExit("canonical login() owner missing")

# Remove retired bootstrap invocations only. The canonical login() implementation
# remains the sole authentication owner.
js = re.sub(r"\n?restoreSession\s*\(\s*\)\s*;?", "\n", js)
PATH.write_text(js, encoding="utf-8")

final_js = PATH.read_text(encoding="utf-8")
if re.search(r"\brestoreSession\s*\(", final_js):
    raise SystemExit("retired restoreSession runtime survived canonicalization")

# The source may contain an HTML form, but this transform must not manufacture a
# second submit owner. The canonical owner is allowed to be absent here because
# a later canonical interactivity transform owns the binding.
submit_pattern = re.compile(
    r"document\.getElementById\(\s*['\"]loginForm['\"]\s*\)\.addEventListener\(\s*['\"]submit['\"]",
    re.S,
)
count = len(list(submit_pattern.finditer(final_js)))
if count > 1:
    raise SystemExit(f"duplicate login submit owners: {count}")
