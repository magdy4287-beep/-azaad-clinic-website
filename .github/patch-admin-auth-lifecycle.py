from pathlib import Path
import re

path = Path("admin.js")
text = path.read_text(encoding="utf-8")

pattern = re.compile(
    r"async function restoreStaffProfile\(\)\s*\{.*?\n\}\n\n/\* ============================================================\n   INITIALIZE",
    re.S,
)

replacement = '''async function restoreStaffProfile() {
  if (!state.user?.id || !state.session?.access_token) {
    return false;
  }

  // The canonical staff authorization path is server-side. Do not query
  // clinic_staff directly from the browser during authentication bootstrap;
  // that path is RLS-sensitive and can deadlock the SPA before the admin UI
  // is made visible.
  if (typeof restoreStaff === "function") {
    try {
      const restored = await restoreStaff();
      if (restored) {
        try {
          sessionStorage.setItem(
            "azaad_admin_token",
            state.session?.access_token || ""
          );
        } catch (_) {}
      }
      return restored;
    } catch (error) {
      console.error("Server-side staff restore error:", error);
      return false;
    }
  }

  console.error("Canonical restoreStaff() is unavailable.");
  return false;
}

/* ============================================================
   INITIALIZE'''

updated, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit("Expected exactly one restoreStaffProfile() block in admin.js")

path.write_text(updated, encoding="utf-8")
print("Patched admin.js authentication lifecycle: restoreStaffProfile -> restoreStaff")
