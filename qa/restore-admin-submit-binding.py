from pathlib import Path

HTML_PATH = Path("admin.html")
JS_PATH = Path("admin.js")
CONTROLLER_PATH = Path("admin-login-controller.js")

html = HTML_PATH.read_text(encoding="utf-8")
js = JS_PATH.read_text(encoding="utf-8")
controller = CONTROLLER_PATH.read_text(encoding="utf-8")

if "async function login(" not in js:
    raise RuntimeError("Canonical admin login() function is missing after auth finalization")
if "STAFF_LOGIN_FUNCTION" not in controller or "form.addEventListener('submit', submit, true)" not in controller:
    raise RuntimeError("Canonical admin-login-controller.js submit owner is missing")

legacy_markers = (
    "azaadInstallLoginBridge",
    "AZAAD_ADMIN_CAPTURE_SUBMIT_BOUND",
    "AZAAD_ADMIN_LOGIN_BRIDGE",
    "Production-parity login bridge",
    "target-local canonical admin #loginForm submit binding",
)
if any(marker in js for marker in legacy_markers):
    raise RuntimeError("Legacy submit bridge remains in admin.js; canonical controller must be sole owner")

# The controller must be present in the generated parity document itself.
# Depending on the build copy rules, an external /admin-login-controller.js
# request can be absent even though the source file exists. Inline the exact
# canonical controller so requestSubmit() always reaches the real submit
# handler. No authentication result or credential is mocked.
controller_source = controller.replace("</script>", "<\\/script>")
inline_script = f'<script type="module">\n{controller_source}\n</script>'
external_script = '<script type="module" src="/admin-login-controller.js"></script>'

if inline_script not in html:
    html = html.replace(external_script, "")
    html = html.replace('</body>', f'  {inline_script}\n</body>')

HTML_PATH.write_text(html, encoding="utf-8")
print("Inlined canonical admin-login-controller.js as the sole production login submit owner.")
