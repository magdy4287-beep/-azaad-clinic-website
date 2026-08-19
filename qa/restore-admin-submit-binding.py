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

# The dedicated controller owns the login boundary. Do not inject any submit
# listener into admin.js, avoiding competing handlers and lifecycle races.
script = '<script type="module" src="/admin-login-controller.js"></script>'
if script not in html:
    html = html.replace('</body>', f'  {script}\n</body>')

HTML_PATH.write_text(html, encoding="utf-8")
print("Canonical admin-login-controller.js is the sole production login submit owner.")
