from pathlib import Path

path = Path('admin.js')
if not path.exists():
    raise SystemExit('admin.js not found')

js = path.read_text(encoding='utf-8')

# Never let an optional post-auth module synchronously abort the Admin controller.
old = 'Promise.resolve(window.AZAAD_STAFF.init()).catch(error =>'
new = 'Promise.resolve().then(() => window.AZAAD_STAFF.init()).catch(error =>'
if old in js:
    js = js.replace(old, new, 1)

# Install a final interaction safety net. It is deliberately small and does not
# own authentication; it only guarantees that a failed optional runtime cannot
# leave the document inert or permanently non-interactive, and that Logout is
# always handled from a capture-phase delegated listener.
marker = '/* ============================================================\n   LOGIN\n   ============================================================ */'
block = r'''/* ============================================================
   FINAL ADMIN INTERACTION SAFETY
   ------------------------------------------------------------
   Optional modules must never be able to freeze the shell. This
   guard does not perform authentication and does not bypass RLS.
   It only restores document interactivity and gives Logout a
   capture-phase emergency path.
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

  const handleLogout = event => {
    const target = event.target?.closest?.(
      '[data-action="logout"], [data-action="sign-out"], #logout, #logoutBtn, #logoutButton, .logout, .logout-btn, .logout-button'
    );

    if (!target || typeof logout !== "function") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void logout();
  };

  const install = () => {
    restoreInteraction();
    document.addEventListener("click", handleLogout, true);
    document.addEventListener("pointerup", handleLogout, true);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        restoreInteraction();
      }
    }, true);
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
print('[AZAAD] final admin interaction safety applied')
