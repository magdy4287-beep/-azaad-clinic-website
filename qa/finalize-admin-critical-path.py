from pathlib import Path
import re

PATH = Path("admin.js")
if not PATH.exists(): raise SystemExit("admin.js not found")
js = PATH.read_text(encoding="utf-8")

# Canonicalize the admin login transition at build time.  There must be exactly
# one submit owner and it must delegate to the canonical login() function.
# Do not create a second authentication implementation here.

submit_pattern = re.compile(r"document\.getElementById\(['\"]loginForm['\"]\)\.addEventListener\(\s*['\"]submit['\"]\s*,\s*async\s*\([^)]*\)\s*=>\s*\{", re.S)
matches = list(submit_pattern.finditer(js))
if len(matches) > 1:
    raise SystemExit(f"duplicate login submit owners: {len(matches)}")
if len(matches) == 0:
    # admin.js owns login(), while the HTML form is intentionally inert until
    # this canonical binding is installed by the build transform.
    marker = "async function login()"
    if marker not in js:
        raise SystemExit("canonical login() owner missing")
    binding = """\n\nconst __AZAAD_CANONICAL_LOGIN_FORM = document.getElementById('loginForm');\nif (__AZAAD_CANONICAL_LOGIN_FORM) {\n  __AZAAD_CANONICAL_LOGIN_FORM.addEventListener('submit', async (event) => {\n    event.preventDefault();\n    await login();\n  }, { once: false });\n}\n"""
    js += binding
    PATH.write_text(js, encoding="utf-8")

# Fail closed if a later transform reintroduces retired duplicate submit owners.
final_js = PATH.read_text(encoding="utf-8")
count = len(list(submit_pattern.finditer(final_js)))
if count != 1:
    raise SystemExit(f"canonical login submit owner count={count}, expected 1")
if "await login();" not in final_js:
    raise SystemExit("canonical login submit binding does not call login()")
