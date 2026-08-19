from pathlib import Path

HTML_PATH = Path("admin.html")
JS_PATH = Path("admin.js")

if "async function login(" not in JS_PATH.read_text(encoding="utf-8"):
    raise RuntimeError("Canonical admin login() function is missing after auth finalization")

html = HTML_PATH.read_text(encoding="utf-8")
js = JS_PATH.read_text(encoding="utf-8")

# The generated bridge must live in the same ES-module scope as login(), but
# it must not be installed until the DOM is ready. This avoids the previous
# failure mode where the transformer ran while #loginForm was not yet present.
bridge = '''\n\n/* Production-parity login bridge: canonical module-scope login + DOM-ready capture binding. */\nwindow.AZAAD_ADMIN_LOGIN_BRIDGE = login;\n\nconst azaadInstallLoginBridge = () => {\n  if (window.AZAAD_ADMIN_CAPTURE_SUBMIT_BOUND) return;\n  const form = document.getElementById("loginForm");\n  if (!form) {\n    console.error("AZAAD login bridge: #loginForm missing at DOM-ready");\n    return;\n  }\n\n  const azaadCaptureSubmit = async (event) => {\n    const target = event.target;\n    if (!(target instanceof HTMLFormElement) || target.id !== "loginForm") return;\n    if (target.dataset.azaadSubmitHandled === "true") return;\n\n    event.preventDefault();\n    event.stopPropagation();\n    event.stopImmediatePropagation();\n    target.dataset.azaadSubmitHandled = "true";\n\n    const usernameInput = document.getElementById("username");\n    const passwordInput = document.getElementById("password");\n    const loginError = document.getElementById("loginError");\n\n    if (loginError) {\n      loginError.textContent = "";\n      loginError.classList.add("hidden");\n    }\n\n    try {\n      await login(usernameInput?.value || "", passwordInput?.value || "");\n    } catch (error) {\n      console.error("Admin login error:", error);\n      if (loginError) {\n        loginError.textContent = error?.message || "تعذر تسجيل الدخول.";\n        loginError.classList.remove("hidden");\n      }\n    } finally {\n      target.dataset.azaadSubmitHandled = "false";\n    }\n  };\n\n  document.addEventListener("submit", azaadCaptureSubmit, true);\n  window.AZAAD_ADMIN_CAPTURE_SUBMIT_BOUND = true;\n  window.AZAAD_PRODUCTION_SUBMIT_BOUND = true;\n};\n\nif (document.readyState === "loading") {\n  document.addEventListener("DOMContentLoaded", azaadInstallLoginBridge, { once: true });\n} else {\n  azaadInstallLoginBridge();\n}\n'''

if "window.AZAAD_ADMIN_LOGIN_BRIDGE" in js or "azaadInstallLoginBridge" in js:
    raise RuntimeError("Login bridge already present; refusing duplicate transformation")
js = js.rstrip() + bridge + "\n"
JS_PATH.write_text(js, encoding="utf-8")

marker = "window.AZAAD_AUTH_READY = window.AZAAD_READY;"
if marker not in html:
    raise RuntimeError("Canonical Azaad auth readiness marker is missing after auth finalization")

# Keep the marker for downstream CI assertions, but do not claim the submit
# binding is ready until the module has actually installed it.
HTML_PATH.write_text(html, encoding="utf-8")
print("Installed DOM-ready canonical admin #loginForm submit binding in admin.js module scope.")
