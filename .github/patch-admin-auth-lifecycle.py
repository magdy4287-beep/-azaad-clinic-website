from pathlib import Path
import re

path = Path("admin.js")
text = path.read_text(encoding="utf-8")

# Make the production admin client use one explicit, shared persistent storage key.
text = re.sub(
    r"const SUPABASE_PUBLISHABLE_KEY =\s*\n\s*\"([^\"]+)\";",
    r'const SUPABASE_PUBLISHABLE_KEY = "\1";\n\nconst SUPABASE_AUTH_STORAGE_KEY = "sb-derofsthjivlkcdnojww-auth-token";',
    text,
    count=1,
)
text = re.sub(
    r"auth:\s*\{\s*\n\s*persistSession:\s*true,\s*\n\s*autoRefreshToken:\s*true,\s*\n\s*detectSessionInUrl:\s*true\s*\n\s*\}",
    "auth: {\n      persistSession: true,\n      autoRefreshToken: true,\n      detectSessionInUrl: true,\n      storage: window.localStorage,\n      storageKey: SUPABASE_AUTH_STORAGE_KEY\n    }",
    text,
    count=1,
)

# Replace the legacy browser-side clinic_staff RLS lookup with one canonical,
# server-authorized restore path. If Supabase's persisted session is missing,
# use the short-lived admin access token as a validation fallback. The fallback
# never invents a refresh token and never uses a service-role key in the browser.
pattern = re.compile(
    r"async function restoreStaffProfile\(\)\s*\{.*?\n\}\n\n/\* ============================================================\n   INITIALIZE",
    re.S,
)

replacement = '''async function restoreStaffProfile() {
  try {
    let session = null;
    let accessToken = null;

    const sessionResult = await supabase.auth.getSession();
    if (!sessionResult.error && sessionResult.data?.session?.access_token) {
      session = sessionResult.data.session;
      accessToken = session.access_token;
    }

    // Reload-resilience fallback: validate the access token that was deliberately
    // kept in sessionStorage by the real login flow. This does not bypass Auth;
    // azaad-admin-auth verifies the JWT and active clinic_staff record server-side.
    if (!accessToken) {
      try {
        accessToken = sessionStorage.getItem("azaad_admin_token");
      } catch (_) {}
    }

    if (!accessToken) {
      return false;
    }

    if (session?.user?.id) {
      state.session = session;
      state.user = session.user;
    }

    const request = async (token) => fetch(
      `${SUPABASE_URL}/functions/v1/azaad-admin-auth`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY
        }
      }
    );

    let response = await request(accessToken);

    if (response.status === 401 && session) {
      const refreshed = await supabase.auth.refreshSession();
      if (!refreshed.error && refreshed.data?.session?.access_token) {
        session = refreshed.data.session;
        accessToken = session.access_token;
        state.session = session;
        state.user = session.user;
        response = await request(accessToken);
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
      sessionStorage.setItem("azaad_admin_token", accessToken);
    } catch (_) {}

    // When a reload lost the Supabase client session but the access token is
    // still valid, keep the verified token available to the authenticated
    // shell. A session can only be rebuilt when Supabase supplied a refresh
    // token; never fabricate one here.
    if (session?.refresh_token) {
      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: session.refresh_token
        });
      } catch (_) {}
    }

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
print("Unified admin auth lifecycle: explicit persistent storage + reload token fallback")
