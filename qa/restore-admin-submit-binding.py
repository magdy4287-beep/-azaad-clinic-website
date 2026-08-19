from pathlib import Path

HTML_PATH = Path("admin.html")
JS_PATH = Path("admin.js")

if "async function login(" not in JS_PATH.read_text(encoding="utf-8"):
    raise RuntimeError("Canonical admin login() function is missing after auth finalization")

html = HTML_PATH.read_text(encoding="utf-8")
js = JS_PATH.read_text(encoding="utf-8")

# Keep the bridge in the canonical ES-module scope where login() exists. Bind
# directly to the real form after DOM readiness instead of relying on document
# delegation or instanceof checks, which can silently miss cross-realm targets.
bridge = '''\n\n/* Production-parity login bridge: canonical module-scope login + DOM-ready target-local binding. */\nwindow.AZAAD_ADMIN_LOGIN_BRIDGE = login;\n\nconst azaadInstallLoginBridge = () => {\n  if (window.AZAAD_ADMIN_CAPTURE_SUBMIT_BOUND) return;\n\n  const form = document.getElementById("loginForm");\n  if (!form) {\n    console.error("AZAAD login bridge: #loginForm missing at DOM-ready");\n    return;\n  }\n\n  const submitLogin = async (event) => {\n    if (!event || event.target?.id !== "loginForm") return;\n    if (form.dataset.azaadSubmitHandled === "true") return;\n\n    event.preventDefault();\n    event.stopPropagation();\n    event.stopImmediatePropagation();\n    form.dataset.azaadSubmitHandled = "true";\n\n    const usernameInput = document.getElementById("username");\n    const passwordInput = document.getElementById("password");\n    const loginError = document.getElementById("loginError");\n\n    if (loginError) {\n      loginError.textContent = "";\n      loginError.classList.add("hidden");\n    }\n\n    try {\n      await login(usernameInput?.value || "", passwordInput?.value || "");\n    } catch (error) {\n      console.error("Admin login error:", error);\n      if (loginError) {\n        loginError.textContent = error?.message || "تعذر تسجيل الدخول.";\n        loginError.classList.remove("hidden");\n      }\n    } finally {\n      form.dataset.azaadSubmitHandled = "false";\n    }\n  };\n\n  form.addEventListener("submit", submitLogin, true);\n  form.onsubmit = submitLogin;\n  window.AZAAD_ADMIN_CAPTURE_SUBMIT_BOUND = true;\n  window.AZAAD_PRODUCTION_SUBMIT_BOUND = true;\n};\n\nif (document.readyState === "loading") {\n  document.addEventListener("DOMContentLoaded", azaadInstallLoginBridge, { once: true });\n} else {\n  azaadInstallLoginBridge();\n}\n'''

if "window.AZAAD_ADMIN_LOGIN_BRIDGE" in js or "azaadInstallLoginBridge" in js:
    raise RuntimeError("Login bridge already present; refusing duplicate transformation")
js = js.rstrip() + bridge + "\n"
JS_PATH.write_text(js, encoding="utf-8")

marker = "window.AZAAD_AUTH_READY = window.AZAAD_READY;"
if marker not in html:
    raise RuntimeError("Canonical Azaad auth readiness marker is missing after auth finalization")

# Preserve the canonical readiness marker; the submit bridge advertises ready
# only after the target-local listener is installed.
HTML_PATH.write_text(html, encoding="utf-8")
print("Installed target-local canonical admin #loginForm submit binding in admin.js module scope.")
