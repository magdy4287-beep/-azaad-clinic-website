from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN_HTML = Path("admin.html")
ADMIN_JS = Path("admin.js")

if not ADMIN_HTML.exists() or not ADMIN_JS.exists():
    raise SystemExit("admin login runtime isolation requires admin.html and admin.js")

html = ADMIN_HTML.read_text(encoding="utf-8")

inline = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.I | re.S)
markers = ("const SUPABASE_URL", "STAFF_LOGIN_FUNCTION", "function login", "clinic_staff")

def strip_legacy(match):
    attrs, body = match.group(1), match.group(2)
    if re.search(r"\bsrc\s*=", attrs, re.I):
        return match.group(0)
    if sum(marker in body for marker in markers) >= 3:
        return "\n"
    return match.group(0)

html = inline.sub(strip_legacy, html)

opening = re.compile(r"<script\b([^>]*)>", re.I | re.S)
src_attr = re.compile(r"\bsrc\s*=\s*(?:([\"'])(.*?)\1|([^\s>]+))", re.I | re.S)
type_module = re.compile(r"\btype\s*=\s*([\"'])module\1", re.I)

# Authentication is the only login-critical controller. The canonical Admin
# shell is deliberately also bootstrapped before authentication because it owns
# the single panel activation/control-plane contract. It has no credential/data
# dependency and must be ready before the first post-auth navigation click.
CRITICAL_PRE_AUTH = {"admin.js", "central-i18n.js", "admin-shell.js"}

def isolate_opening(match):
    attrs = match.group(1)
    src_match = src_attr.search(attrs)
    if not src_match:
        return match.group(0)
    src = src_match.group(2) if src_match.group(2) is not None else src_match.group(3)
    path = (urlsplit(src).path or src).lstrip("/").lower()
    if path in CRITICAL_PRE_AUTH:
        if path == "central-i18n.js":
            without_defer = re.sub(r"\bdefer(?:\s*=\s*(?:[\"'])?[^\s>\"']*(?:[\"'])?)?", "", attrs, flags=re.I)
            return "<script" + without_defer.rstrip() + " defer>"
        return match.group(0)
    is_module = bool(type_module.search(attrs))
    module_attr = ' data-azaad-after-auth-type="module"' if is_module else ''
    without_src = (attrs[:src_match.start()] + attrs[src_match.end():]).strip()
    return f'<script data-azaad-after-auth-src="{src}"{module_attr}{(" " + without_src) if without_src else ""}>'

html = opening.sub(isolate_opening, html)

# If an earlier transform already converted the shell into an inert post-auth
# placeholder, promote that canonical placeholder back to a normal deferred
# script. This makes the transform idempotent and prevents the shell from being
# accidentally delayed by the post-auth loader on subsequent build passes.
shell_placeholder = re.compile(
    r'<script\b[^>]*data-azaad-after-auth-src=["\']/admin-shell\.js\?v=1["\'][^>]*>\s*</script>',
    re.I,
)
html, promoted = shell_placeholder.subn(
    '<script src="/admin-shell.js?v=1" defer data-azaad-admin-control-plane="1"></script>',
    html,
    count=1,
)
if promoted == 0 and not re.search(r'<script\b[^>]*\bsrc=["\']/admin-shell\.js\?v=1["\'][^>]*>', html, re.I):
    raise SystemExit("canonical Admin shell was not established on the pre-auth path")

if len(re.findall(r'<form\b[^>]*\bid=[\"\']loginForm[\"\']', html, re.I)) != 1:
    raise SystemExit("Admin must contain exactly one login form")
if sum(1 for m in inline.finditer(html) if sum(marker in m.group(2) for marker in markers) >= 3) > 0:
    raise SystemExit("Legacy inline Admin controller remains")

ADMIN_HTML.write_text(html, encoding="utf-8")

js = ADMIN_JS.read_text(encoding="utf-8")
loader = r'''

/* ============================================================
   POST-AUTH RUNTIME LOADER
   ------------------------------------------------------------
   Non-critical feature scripts are deliberately loaded only after
   the Admin shell is interactive. Loading them is never awaited by
   authentication or initialization.
   ============================================================ */
async function loadAfterAuthRuntimes() {
  if (window.__AZAAD_AFTER_AUTH_RUNTIMES_LOADED) return;
  window.__AZAAD_AFTER_AUTH_RUNTIMES_LOADED = true;

  const manifests = Array.from(
    document.querySelectorAll("script[data-azaad-after-auth-src]")
  );

  for (const manifest of manifests) {
    const src = manifest.dataset.azaadAfterAuthSrc;
    if (!src) continue;

    await new Promise(resolve => {
      const script = document.createElement("script");
      script.src = src;
      if (manifest.dataset.azaadAfterAuthType === "module") {
        script.type = "module";
      }
      script.onload = resolve;
      script.onerror = resolve;
      document.body.appendChild(script);
    });

    // Yield between optional modules so the browser keeps input/paint responsive.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
'''

if "async function loadAfterAuthRuntimes()" not in js:
    marker = "/* ============================================================\n   START\n   ============================================================ */"
    if marker not in js:
        raise SystemExit("Admin START marker not found")
    js = js.replace(marker, loader + "\n" + marker, 1)

# Do NOT inject an awaited runtime load into initializeApplication. The
# post-auth freeze hardening owns the scheduling boundary and will start the
# optional loader only after the critical shell bindings are complete.
needle = '''  try {
    await loadAfterAuthRuntimes();
  } catch (error) {
    console.error("Post-auth Admin runtime load error:", error);
  }

'''
js = js.replace(needle, "", 1)

ADMIN_JS.write_text(js, encoding="utf-8")
print("[AZAAD] Admin login isolation stage completed; auth + canonical shell are pre-auth, optional feature runtimes remain post-auth")