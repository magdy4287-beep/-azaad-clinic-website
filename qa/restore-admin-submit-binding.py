from pathlib import Path

HTML_PATH = Path("admin.html")
JS_PATH = Path("admin.js")
CONTROLLER_PATH = Path("admin-login-controller.js")

html = HTML_PATH.read_text(encoding="utf-8")
js = JS_PATH.read_text(encoding="utf-8")
controller = CONTROLLER_PATH.read_text(encoding="utf-8")

# finalize-auth.py can rewrite the canonical controller before this transformer
# runs. Validate the post-finalization behavior contract rather than one exact
# pre-finalization source spelling.
if "STAFF_LOGIN_FUNCTION" not in controller:
    raise RuntimeError("Canonical admin-login-controller.js lost STAFF_LOGIN_FUNCTION")
if "fetch(STAFF_LOGIN_FUNCTION" not in controller:
    raise RuntimeError("Canonical admin-login-controller.js lost real staff-login fetch")
if "setSession" not in controller:
    raise RuntimeError("Canonical admin-login-controller.js lost Supabase setSession")
if "AZAAD_LOGIN_CONTROLLER_READY" not in controller:
    raise RuntimeError("Canonical admin-login-controller.js lost readiness contract")
if "addEventListener('submit'" not in controller and 'addEventListener("submit"' not in controller:
    raise RuntimeError("Canonical admin-login-controller.js has no submit handler")

legacy_markers = (
    "azaadInstallLoginBridge",
    "AZAAD_ADMIN_CAPTURE_SUBMIT_BOUND",
    "AZAAD_ADMIN_LOGIN_BRIDGE",
    "Production-parity login bridge",
    "target-local canonical admin #loginForm submit binding",
)
if any(marker in js for marker in legacy_markers):
    raise RuntimeError("Legacy submit bridge remains in admin.js; canonical controller must be sole owner")

# The generated parity document must contain the exact canonical controller.
# This removes a build-path dependency on /admin-login-controller.js while
# preserving the real authentication path.
controller_source = controller.replace("</script>", "<\\/script>")
inline_script = f'<script type="module">\n{controller_source}\n</script>'
external_script = '<script type="module" src="/admin-login-controller.js"></script>'

if inline_script not in html:
    html = html.replace(external_script, "")
    html = html.replace('</body>', f'  {inline_script}\n</body>')

HTML_PATH.write_text(html, encoding="utf-8")
print("Validated and inlined canonical admin-login-controller.js as the sole production login submit owner.")
