from pathlib import Path

path = Path("admin.html")
text = path.read_text(encoding="utf-8")

if "window.AZAAD_PRODUCTION_SUBMIT_BOUND" in text:
    print("Admin production-parity submit binding already present.")
    raise SystemExit(0)

if "async function login(" not in text:
    raise RuntimeError("Canonical admin login() function is missing after auth finalization")

marker = "window.AZAAD_AUTH_READY = window.AZAAD_READY;"
if marker not in text:
    raise RuntimeError("Canonical Azaad auth readiness marker is missing after auth finalization")

binding = '''

const azaadLoginForm = document.getElementById("loginForm");
if (!azaadLoginForm) {
  throw new Error("Canonical #loginForm is missing after auth finalization");
}
if (typeof login !== "function") {
  throw new Error("Canonical login() function is missing after auth finalization");
}
if (!azaadLoginForm.dataset.azaadSubmitBound) {
  azaadLoginForm.addEventListener("submit", login);
  azaadLoginForm.dataset.azaadSubmitBound = "true";
}
window.AZAAD_PRODUCTION_SUBMIT_BOUND = true;
'''

text = text.replace(marker, marker + binding, 1)
path.write_text(text, encoding="utf-8")
print("Restored canonical admin #loginForm submit binding after auth finalization.")
