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

/* AZAAD_LOGIN_CONTROLLER_READY_V3
 * Readiness signal only. Authentication remains exclusively owned by the
 * canonical login() handler. This property has no side effects and performs
 * no login, token, session, submit, or network operation.
 *
 * Use a live getter because the Supabase client is canonical runtime state;
 * readiness must reflect that state rather than race a one-time assignment.
 */
Object.defineProperty(window, "AZAAD_LOGIN_CONTROLLER_READY", {
  configurable: true,
  get() {
    return Boolean(
      document.getElementById("loginForm") &&
      window.AZAAD?.supabase?.auth?.setSession
    );
  }
});'''

if "AZAAD_LOGIN_CONTROLLER_READY_V3" in text:
    print("Admin login readiness marker V3 already present.")
    raise SystemExit(0)

if marker not in text:
    raise SystemExit("Canonical window.AZAAD marker not found")

path.write_text(text.replace(marker, ready, 1), encoding="utf-8")
print("Injected canonical admin login readiness marker V3.")
