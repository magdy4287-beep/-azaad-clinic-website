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

# A late critical-path transform historically reintroduced bindTabs() after the
# canonical interactivity transform had retired it. Remove the invocation here as
# a final fail-closed normalization; navigation belongs exclusively to admin-shell.
js = re.sub(r'^[ \t]*bindTabs\(\);[ \t]*\n?', '', js, flags=re.M)
if re.search(r'\bfunction\s+bindTabs\s*\(', js):
    raise SystemExit('Legacy bindTabs function remains in Admin controller')
if re.search(r'\bbindTabs\s*\(', js):
    raise SystemExit('Legacy bindTabs invocation remains in Admin controller')

# Install only an interaction-recovery safety net. Authentication and Logout have
# exactly one owner: admin.js bindLogout(). A second capture-phase Logout handler
# caused duplicate ownership and could invoke logout twice (pointerup + click),
# creating auth races and leaving the shell apparently frozen.
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
print('[AZAAD] final admin interaction safety applied; navigation remains shell-owned and legacy bindTabs is forbidden')