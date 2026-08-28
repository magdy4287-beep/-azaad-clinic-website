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


login_bounds = bounds(js, "async function login(")
if not login_bounds:
    raise SystemExit("canonical login() owner missing")
login_body = js[login_bounds[0]:login_bounds[1]]

submit_pattern = re.compile(
    r"document\.getElementById\(\s*['\"]loginForm['\"]\s*\)"
    r"\.addEventListener\(\s*['\"]submit['\"]\s*\)",
    re.S,
)
count = len(list(submit_pattern.finditer(js)))
if count > 1:
    raise SystemExit(f"duplicate login submit owners: {count}")

activation = '''
function activateAuthenticatedAdminShell() {
  const loginPage = document.getElementById("loginPage");
  const adminPage = document.getElementById("adminPage");

  if (loginPage) loginPage.classList.add("hidden");
  if (adminPage) adminPage.classList.remove("hidden");

  updateUserIdentity();
}
'''
if "function activateAuthenticatedAdminShell()" not in js:
    insert_marker = "/* ============================================================\n   LOGOUT\n   ============================================================ */"
    if insert_marker not in js:
        raise SystemExit("Could not locate logout insertion marker")
    js = js.replace(insert_marker, activation + "\n" + insert_marker, 1)

login_bounds = bounds(js, "async function login(")
login_body = js[login_bounds[0]:login_bounds[1]]

role_pattern = re.compile(
    r"applyStaffRole\s*\(\s*result\.staff\s*\)\s*;",
    re.S,
)
role_match = role_pattern.search(login_body)
if not role_match:
    raise SystemExit("canonical login role application point not found")

following = login_body[role_match.end():]
if "state.session = result.session;" not in following[:500]:
    insertion = '''\n\n  state.session = result.session;\n  state.user = result.user || null;\n  activateAuthenticatedAdminShell();'''
    login_body = (
        login_body[:role_match.end()]
        + insertion
        + login_body[role_match.end():]
    )

js = js[:login_bounds[0]] + login_body + js[login_bounds[1]:]
PATH.write_text(js, encoding="utf-8")
print("[AZAAD] canonical login critical-path transform validated")
