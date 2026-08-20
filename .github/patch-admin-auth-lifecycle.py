from pathlib import Path
import re

path = Path("admin.js")
text = path.read_text(encoding="utf-8")

# Replace the legacy browser-side clinic_staff RLS lookup with one canonical,
# server-authorized restore path. Keep all session/token state in one function
# so finalize-auth.py cannot leave a second competing restore lifecycle.
pattern = re.compile(
    r"async function restoreStaffProfile\(\)\s*\{.*?\n\}\n\n/\* ============================================================\n   INITIALIZE",
    re.S,
)

replacement = '''async function restoreStaffProfile() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token || !session?.user?.id) {
      return false;
    }

    state.session = session;
    state.user = session.user;

    const request = async () => fetch(
      `${SUPABASE_URL}/functions/v1/azaad-admin-auth`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${state.session.access_token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY
        }
      }
    );

    let response = await request();

    if (response.status === 401) {
      const refreshed = await supabase.auth.refreshSession();
      if (!refreshed.error && refreshed.data?.session?.access_token) {
        state.session = refreshed.data.session;
        state.user = refreshed.data.session.user;
        response = await request();
      }
    }

    let body = {};
    try { body = await response.json(); } catch (_) {}

    if (!response.ok || !body?.admin || body.admin.active === false) {
      try { sessionStorage.removeItem("azaad_admin_token"); } catch (_) {}
      return false;
    }

    if (!applyStaffRole(body.admin)) {
      try { sessionStorage.removeItem("azaad_admin_token"); } catch (_) {}
      return false;
    }

    state.user = body.user || state.user;
    try {
      sessionStorage.setItem("azaad_admin_token", state.session.access_token);
    } catch (_) {}

    return true;
  } catch (error) {
    console.error("Canonical admin auth restore failed:", error);
    try { sessionStorage.removeItem("azaad_admin_token"); } catch (_) {}
    return false;
  }
}

/* ============================================================
   INITIALIZE'''

updated, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit("Expected exactly one restoreStaffProfile() block in admin.js")

# Remove any restoreStaff() helper injected by finalize-auth.py so there is
# exactly one authentication restore implementation in admin.js.
updated = re.sub(
    r"\nasync function restoreStaff\(\)\s*\{.*?\n\}\n",
    "\n",
    updated,
    flags=re.S,
)

# Remove stale startup calls that invoke a second restore lifecycle if present.
updated = re.sub(
    r"\n\s*(?:const|let)\s+valid\s*=\s*await\s+restoreStaff\(\);\s*\n\s*if\s*\(\s*valid\s*\)\s*\{.*?\n\s*\}\s*",
    "\n",
    updated,
    flags=re.S,
)

path.write_text(updated, encoding="utf-8")
print("Unified admin auth lifecycle: restoreStaffProfile is the single canonical restore path")
