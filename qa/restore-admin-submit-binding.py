from pathlib import Path

HTML_PATH = Path("admin.html")
JS_PATH = Path("admin.js")

html = HTML_PATH.read_text(encoding="utf-8")
js = JS_PATH.read_text(encoding="utf-8")

if "window.AZAAD_PRODUCTION_SUBMIT_BOUND" in html and "window.AZAAD_ADMIN_LOGIN_BRIDGE" in js and "azaadCaptureSubmit" in js:
    print("Admin production-parity submit binding already present.")
    raise SystemExit(0)

if "async function login(" not in js:
    raise RuntimeError("Canonical admin login() function is missing after auth finalization")

# Keep the bridge in the ES-module scope, but bind at document capture phase.
# This guarantees requestSubmit() reaches the canonical login function even if
# another generated handler calls preventDefault/stopPropagation during bubble.
bridge = '''\n\n/* Production-parity login bridge: canonical module-scope login + capture binding. */\nwindow.AZAAD_ADMIN_LOGIN_BRIDGE = login;\n\nconst azaadCanonicalLoginForm = document.getElementById("loginForm");\nif (!azaadCanonicalLoginForm) {\n  throw new Error("Canonical #loginForm is missing after auth finalization");\n}\n\nconst azaadCaptureSubmit = async (event) => {\n  const form = event.target;\n  if (!(form instanceof HTMLFormElement) || form.id !== "loginForm") return;\n  if (form.dataset.azaadSubmitHandled === "true") return;\n\n  event.preventDefault();\n  event.stopPropagation();\n  event.stopImmediatePropagation();\n  form.dataset.azaadSubmitHandled = "true";\n\n  const usernameInput = document.getElementById("username");\n  const passwordInput = document.getElementById("password");\n  const loginError = document.getElementById("loginError");\n\n  if (loginError) {\n    loginError.textContent = "";\n    loginError.classList.add("hidden");\n  }\n\n  try {\n    await login(usernameInput?.value || "", passwordInput?.value || "");\n  } catch (error) {\n    console.error("Admin login error:", error);\n    if (loginError) {\n      loginError.textContent = error?.message || "تعذر تسجيل الدخول.";\n      loginError.classList.remove("hidden");\n    }\n  } finally {\n    form.dataset.azaadSubmitHandled = "false";\n  }\n};\n\nif (!window.AZAAD_ADMIN_CAPTURE_SUBMIT_BOUND) {\n  document.addEventListener("submit", azaadCaptureSubmit, true);\n  window.AZAAD_ADMIN_CAPTURE_SUBMIT_BOUND = true;\n}\n'''

if "window.AZAAD_ADMIN_LOGIN_BRIDGE" not in js or "azaadCaptureSubmit" not in js:
    js = js.rstrip() + bridge + "\n"
    JS_PATH.write_text(js, encoding="utf-8")

marker = "window.AZAAD_AUTH_READY = window.AZAAD_READY;"
if marker not in html:
    raise RuntimeError("Canonical Azaad auth readiness marker is missing after auth finalization")

if "window.AZAAD_PRODUCTION_SUBMIT_BOUND" not in html:
    binding_marker = "\nwindow.AZAAD_PRODUCTION_SUBMIT_BOUND = true;\n"
    html = html.replace(marker, marker + binding_marker, 1)

HTML_PATH.write_text(html, encoding="utf-8")
print("Restored canonical admin #loginForm submit binding in admin.js module capture scope.")
