from pathlib import Path

HTML_PATH = Path("admin.html")
JS_PATH = Path("admin.js")
CONTROLLER_PATH = Path("admin-login-controller.js")

html = HTML_PATH.read_text(encoding="utf-8")
js = JS_PATH.read_text(encoding="utf-8")
controller = CONTROLLER_PATH.read_text(encoding="utf-8")

# The canonical controller is allowed to own the single production submit
# path. Validate behavior, not a historical implementation spelling.
if "loginForm" not in controller:
    raise RuntimeError("Canonical admin-login-controller.js lost login form contract")
if "fetch(" not in controller or "staff-login" not in controller:
    raise RuntimeError("Canonical admin-login-controller.js lost real staff-login request")
if "setSession" not in controller:
    raise RuntimeError("Canonical admin-login-controller.js lost Supabase setSession")
if "AZAAD_LOGIN_CONTROLLER_READY" not in controller:
    raise RuntimeError("Canonical admin-login-controller.js lost readiness contract")
if "addEventListener('submit'" not in controller and 'addEventListener("submit"' not in controller:
    raise RuntimeError("Canonical admin-login-controller.js has no submit owner")

for marker in ("preventDefault()", "stopPropagation()", "stopImmediatePropagation()"):
    if marker in controller:
        raise RuntimeError(f"Canonical controller contains forbidden submit interception: {marker}")

legacy_markers = (
    "azaadInstallLoginBridge",
    "AZAAD_ADMIN_CAPTURE_SUBMIT_BOUND",
    "AZAAD_ADMIN_LOGIN_BRIDGE",
    "Production-parity login bridge",
    "target-local canonical admin #loginForm submit binding",
)
if any(marker in js for marker in legacy_markers):
    raise RuntimeError("Legacy submit bridge remains in admin.js")

controller_source = controller.replace("</script>", "<\\/script>")
inline_script = f'<script type="module">\n{controller_source}\n</script>'
external_script = '<script type="module" src="/admin-login-controller.js"></script>'

if inline_script not in html:
    html = html.replace(external_script, "")
    html = html.replace('</body>', f'  {inline_script}\n</body>')

HTML_PATH.write_text(html, encoding="utf-8")
print("Validated and inlined canonical admin-login-controller.js as the sole production login submit owner.")
