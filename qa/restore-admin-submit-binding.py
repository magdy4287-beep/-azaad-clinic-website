from pathlib import Path

HTML_PATH = Path("admin.html")
JS_PATH = Path("admin.js")
CONTROLLER_PATH = Path("admin-login-controller.js")

html = HTML_PATH.read_text(encoding="utf-8")
js = JS_PATH.read_text(encoding="utf-8")
controller = CONTROLLER_PATH.read_text(encoding="utf-8")

# The canonical controller is the single production submit owner. Validate the
# actual behavioral contract rather than forbidding the interception primitives
# that a legitimate capture-phase owner must use to prevent a second handler.
required = (
    ("loginForm", "login form contract"),
    ("fetch(", "real staff-login request"),
    ("staff-login", "real staff-login endpoint"),
    ("setSession", "Supabase session establishment"),
    ("AZAAD_LOGIN_CONTROLLER_READY", "readiness contract"),
    ("addEventListener('submit'", "submit owner"),
    ("preventDefault()", "native submit cancellation"),
)
for marker, label in required:
    if marker not in controller:
        raise RuntimeError(f"Canonical controller lost {label}: {marker}")

# The owner must be capture-phase and must stop competing handlers. This is an
# intentional invariant, not a forbidden pattern: otherwise admin.js can run a
# second login path after the canonical adapter has started authentication.
if "addEventListener('submit', authenticate, true)" not in controller:
    raise RuntimeError("Canonical controller is not the capture-phase submit owner")
if "stopImmediatePropagation()" not in controller:
    raise RuntimeError("Canonical submit owner does not block competing handlers")

legacy_markers = (
    "azaadInstallLoginBridge",
    "AZAAD_ADMIN_CAPTURE_SUBMIT_BOUND",
    "AZAAD_ADMIN_LOGIN_BRIDGE",
    "Production-parity login bridge",
    "target-local canonical admin #loginForm submit binding",
)
if any(marker in js for marker in legacy_markers):
    raise RuntimeError("Legacy submit bridge remains in admin.js")

# The generated parity document must contain the canonical controller exactly.
controller_source = controller.replace("</script>", "<\\/script>")
inline_script = f'<script type="module">\n{controller_source}\n</script>'
external_script = '<script type="module" src="/admin-login-controller.js"></script>'

if inline_script not in html:
    html = html.replace(external_script, "")
    html = html.replace('</body>', f'  {inline_script}\n</body>')

HTML_PATH.write_text(html, encoding="utf-8")
print("Validated and inlined canonical admin-login-controller.js as the sole production login submit owner.")
