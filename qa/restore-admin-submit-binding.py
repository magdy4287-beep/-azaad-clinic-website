from pathlib import Path

HTML_PATH = Path("admin.html")
JS_PATH = Path("admin.js")

html = HTML_PATH.read_text(encoding="utf-8")
js = JS_PATH.read_text(encoding="utf-8")

if "window.AZAAD_PRODUCTION_SUBMIT_BOUND" in html and "window.AZAAD_ADMIN_LOGIN_BRIDGE" in js:
    print("Admin production-parity submit binding already present.")
    raise SystemExit(0)

if "async function login(" not in js:
    raise RuntimeError("Canonical admin login() function is missing after auth finalization")

# admin.js is an ES module, so an inline classic script in admin.html cannot
# see its module-scoped `login()` function. The previous transformer inserted
# `typeof login`/`login(...)` into a classic script, which failed at runtime
# before any staff-login POST was issued. Export a narrow, explicit bridge from
# the module itself and bind the form from the same module scope.
bridge = '''\n\n/* Production-parity login bridge: keep the canonical login() module-scoped. */\nwindow.AZAAD_ADMIN_LOGIN_BRIDGE = login;\n\nconst azaadCanonicalLoginForm = document.getElementById("loginForm");\nif (!azaadCanonicalLoginForm) {\n  throw new Error("Canonical #loginForm is missing after auth finalization");\n}\nif (!azaadCanonicalLoginForm.dataset.azaadSubmitBound) {\n  azaadCanonicalLoginForm.addEventListener("submit", async (event) => {\n    event.preventDefault();\n    const usernameInput = document.getElementById("username");\n    const passwordInput = document.getElementById("password");\n    const loginError = document.getElementById("loginError");\n\n    if (loginError) {\n      loginError.textContent = "";\n      loginError.classList.add("hidden");\n    }\n\n    try {\n      await login(usernameInput?.value || "", passwordInput?.value || "");\n    } catch (error) {\n      console.error("Admin login error:", error);\n      if (loginError) {\n        loginError.textContent = error?.message || "تعذر تسجيل الدخول.";\n        loginError.classList.remove("hidden");\n      }\n    }\n  });\n  azaadCanonicalLoginForm.dataset.azaadSubmitBound = "true";\n}\n'''

if "window.AZAAD_ADMIN_LOGIN_BRIDGE" not in js:
    js = js.rstrip() + bridge + "\n"
    JS_PATH.write_text(js, encoding="utf-8")

# Remove the broken classic-script binding if a previous generated copy had it.
# The canonical binding now lives inside the ES module where `login()` is visible.
marker = "window.AZAAD_AUTH_READY = window.AZAAD_READY;"
if marker not in html:
    raise RuntimeError("Canonical Azaad auth readiness marker is missing after auth finalization")

if "window.AZAAD_PRODUCTION_SUBMIT_BOUND" not in html:
    binding_marker = "\nwindow.AZAAD_PRODUCTION_SUBMIT_BOUND = true;\n"
    html = html.replace(marker, marker + binding_marker, 1)

HTML_PATH.write_text(html, encoding="utf-8")
print("Restored canonical admin #loginForm submit binding inside the admin.js ES module scope.")
