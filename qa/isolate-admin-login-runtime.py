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

body_match = re.search(r"<body\b[^>]*>(.*)</body>", html, re.I | re.S)
if not body_match:
    raise SystemExit("Admin body not found")

body = body_match.group(1)
opening = re.compile(r"<script\b([^>]*)>", re.I | re.S)

# Quoted or unquoted src attributes are both accepted by HTML. Normalize both.
src_attr = re.compile(r"\bsrc\s*=\s*(?:([\"'])(.*?)\1|([^\s>]+))", re.I | re.S)
type_module = re.compile(r"\btype\s*=\s*([\"'])module\1", re.I)

def isolate_opening(match):
    attrs = match.group(1)
    src_match = src_attr.search(attrs)
    if not src_match:
        return match.group(0)

    src = src_match.group(2) if src_match.group(2) is not None else src_match.group(3)
    path = (urlsplit(src).path or src).lstrip("/").lower()
    if path == "admin.js":
        return match.group(0)

    is_module = bool(type_module.search(attrs))
    module_attr = ' data-azaad-after-auth-type="module"' if is_module else ''
    without_src = attrs[:src_match.start()] + attrs[src_match.end():]
    without_src = without_src.strip()
    return f'<script data-azaad-after-auth-src="{src}"{module_attr}{(" " + without_src) if without_src else ""}>'

body = opening.sub(isolate_opening, body)
html = html[:body_match.start(1)] + body + html[body_match.end(1):]

if len(re.findall(r'<form\b[^>]*\bid=[\"\']loginForm[\"\']', html, re.I)) != 1:
    raise SystemExit("Admin must contain exactly one login form")
if re.search(r'<body\b[^>]*>.*?<script\b[^>]*\bsrc\s*=', html, re.I | re.S):
    raise SystemExit("A body script still has an executable src on the Admin login path")
if sum(1 for m in inline.finditer(html) if sum(marker in m.group(2) for marker in markers) >= 3) > 0:
    raise SystemExit("Legacy inline Admin controller remains")

ADMIN_HTML.write_text(html, encoding="utf-8")

js = ADMIN_JS.read_text(encoding="utf-8")
loader = r'''

/* ============================================================
   POST-AUTH RUNTIME LOADER
   ------------------------------------------------------------
   Nothing except admin.js is allowed to execute while the login surface is
   interactive. The build converts every other Admin script into an inert
   data-azaad-after-auth-src manifest. Activate it only after authentication.
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

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      if (manifest.dataset.azaadAfterAuthType === "module") script.type = "module";
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load Admin runtime: ${src}`));
      document.body.appendChild(script);
    });
  }
}
'''

if "async function loadAfterAuthRuntimes()" not in js:
    marker = "/* ============================================================\n   START\n   ============================================================ */"
    if marker not in js:
        raise SystemExit("Admin START marker not found")
    js = js.replace(marker, loader + "\n" + marker, 1)

if "await loadAfterAuthRuntimes();" not in js:
    needle = "  await loadBookings();\n\n  bindTabs();"
    replacement = "  await loadBookings();\n\n  try {\n    await loadAfterAuthRuntimes();\n  } catch (error) {\n    console.error(\"Post-auth Admin runtime load error:\", error);\n  }\n\n  bindTabs();"
    if needle not in js:
        raise SystemExit("initializeApplication load boundary not found")
    js = js.replace(needle, replacement, 1)

ADMIN_JS.write_text(js, encoding="utf-8")
print("[AZAAD] Admin login isolated: only admin.js executes pre-auth; all other runtimes are post-auth inert manifests")
