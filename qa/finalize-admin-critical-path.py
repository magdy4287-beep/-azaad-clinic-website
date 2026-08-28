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
            if ch == "\n": line_comment = False
            i += 1; continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False; i += 2; continue
            i += 1; continue
        if quote:
            if escape: escape = False
            elif ch == "\\": escape = True
            elif ch == quote: quote = None
            i += 1; continue
        if ch in "'\"`": quote = ch; i += 1; continue
        if ch == "/" and nxt == "/": line_comment = True; i += 2; continue
        if ch == "/" and nxt == "*": block_comment = True; i += 2; continue
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0: return (start, i + 1)
        i += 1
    return None

if not bounds(js, "async function login("):
    raise SystemExit("canonical login() owner missing")

submit_pattern = re.compile(
    r"document\.getElementById\(\s*['\"]loginForm['\"]\s*\)\.addEventListener\(\s*['\"]submit['\"]",
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
if not login_bounds:
    raise SystemExit("canonical login() boundary missing")
login_body = js[login_bounds[0]:login_bounds[1]]

needle = '''  applyStaffRole(
    result.staff
  );

  const {
    error
  } =
    await supabase.auth.setSession({'''
replacement = '''  applyStaffRole(
    result.staff
  );

  state.session = result.session;
  state.user = result.user || null;
  activateAuthenticatedAdminShell();

  const {
    error
  } =
    await supabase.auth.setSession({'''
if needle not in login_body:
    raise SystemExit("login shell activation insertion point not found")
login_body = login_body.replace(needle, replacement, 1)
js = js[:login_bounds[0]] + login_body + js[login_bounds[1]:]

PATH.write_text(js, encoding="utf-8")
print("[AZAAD] canonical login critical-path transform validated")
