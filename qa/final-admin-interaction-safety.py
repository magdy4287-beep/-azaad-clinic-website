from pathlib import Path
import re

path = Path('admin.js')
if not path.exists():
    raise SystemExit('admin.js not found')

js = path.read_text(encoding='utf-8')

# Never let an optional post-auth module synchronously abort the Admin controller.
old = 'Promise.resolve(window.AZAAD_STAFF.init()).catch(error =>'
new = 'Promise.resolve().then(() => window.AZAAD_STAFF.init()).catch(error =>'
if old in js:
    js = js.replace(old, new, 1)

# This transform runs before canonicalize-admin-interactivity-v2.py. It may remove
# a legacy invocation, but it must not pretend to be the navigation owner or fail
# on source-level symbols that the next canonical transform is responsible for
# retiring. The final generated artifact is fail-closed by the canonical ownership
# and interactivity gates after that transform has run.
js = re.sub(r'^[ \t]*bindTabs\(\);[ \t]*\n?', '', js, flags=re.M)
js = re.sub(r'^[ \t]*switchPanel\([^;]+;[ \t]*\n?', '', js, flags=re.M)

marker = '/* ============================================================\n   LOGIN\n   ============================================================ */'
block = r'''/* ============================================================
   FINAL ADMIN INTERACTION SAFETY
   ------------------------------------------------------------
   Optional modules must never be able to freeze the shell.
   Authentication and Logout remain owned exclusively by the
   Admin controller; this guard only restores document interactivity.
   It does not perform authentication and does not bypass RLS.
   ============================================================ */
(function installAdminInteractionSafety() {
  const restoreInteraction = () => {
    try {
      document.documentElement.removeAttribute("inert");
      document.body?.removeAttribute("inert");
      if (document.body) {
        document.body.style.pointerEvents = "";
      }
    } catch (error) {
      console.error("Admin interaction safety error:", error);
    }
  };

  const install = () => {
    restoreInteraction();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }

  window.addEventListener("error", restoreInteraction, true);
  window.addEventListener("unhandledrejection", restoreInteraction, true);
})();

'''
if marker in js and 'FINAL ADMIN INTERACTION SAFETY' not in js:
    js = js.replace(marker, block + marker, 1)

path.write_text(js, encoding='utf-8')
print('[AZAAD] final admin interaction safety applied; navigation retirement is delegated to canonical interactivity stage')