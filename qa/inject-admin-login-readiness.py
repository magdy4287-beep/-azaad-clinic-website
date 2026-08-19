from pathlib import Path

path = Path("admin.html")
text = path.read_text(encoding="utf-8")

marker = "window.AZAAD = {\n  supabase,\n  state,\n  hasPermission,\n  refresh:load,\n  logout\n};"

ready = '''window.AZAAD = {
  supabase,
  state,
  hasPermission,
  refresh:load,
  logout
};

/* AZAAD_LOGIN_CONTROLLER_READY_V2
 * Test-readiness signal only. The canonical login() handler remains the
 * only authentication owner. This block never submits the form, calls
 * staff-login, creates a session, or writes a token.
 */
(function(){
  function markReady(){
    const form = document.getElementById("loginForm");
    if (!form || !window.AZAAD?.supabase?.auth?.setSession) return false;
    window.AZAAD_LOGIN_CONTROLLER_READY = true;
    return true;
  }
  if (markReady()) return;
  const timer = setInterval(() => {
    if (markReady()) clearInterval(timer);
  }, 25);
  setTimeout(() => clearInterval(timer), 10000);
})();'''

if "AZAAD_LOGIN_CONTROLLER_READY_V2" in text:
    print("Admin login readiness marker already present.")
    raise SystemExit(0)

if marker not in text:
    raise SystemExit("Canonical window.AZAAD marker not found")

path.write_text(text.replace(marker, ready, 1), encoding="utf-8")
print("Injected canonical admin login readiness marker.")
