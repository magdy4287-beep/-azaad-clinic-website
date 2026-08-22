from pathlib import Path
import re

path = Path("admin.js")
text = path.read_text(encoding="utf-8")

# This transform is intentionally idempotent. The production build can invoke
# several auth transforms in sequence, so this script must never add a second
# auth constant or a second restore lifecycle.
CANONICAL_STORAGE_KEY = "azaad-clinic-admin-auth"

# Normalize ALL existing storage-key declarations to one canonical declaration.
key_pattern = re.compile(r"const SUPABASE_AUTH_STORAGE_KEY\s*=\s*['\"][^'\"]+['\"];?")
key_matches = list(key_pattern.finditer(text))
if key_matches:
    first = key_matches[0]
    text = text[:first.start()] + f'const SUPABASE_AUTH_STORAGE_KEY = "{CANONICAL_STORAGE_KEY}";' + text[first.end():]
    text = key_pattern.sub("", text, count=0) if False else text
    # Remove any later declarations, preserving the first canonical one.
    later = list(key_pattern.finditer(text))[1:]
    for match in reversed(later):
        text = text[:match.start()] + text[match.end():]
else:
    publishable = re.search(r'const SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)";', text)
    if not publishable:
        raise SystemExit("Cannot establish canonical admin auth storage key: publishable key declaration not found")
    insertion = publishable.end()
    text = text[:insertion] + f'\n\nconst SUPABASE_AUTH_STORAGE_KEY = "{CANONICAL_STORAGE_KEY}";' + text[insertion:]

# Normalize the one Supabase auth configuration. Do not append another client.
auth_pattern = re.compile(
    r"auth:\s*\{\s*"
    r"persistSession:\s*true,\s*"
    r"autoRefreshToken:\s*true,\s*"
    r"detectSessionInUrl:\s*(?:true|false)\s*,?\s*"
    r"(?:storage:\s*window\.localStorage\s*,?\s*)?"
    r"(?:storageKey:\s*SUPABASE_AUTH_STORAGE_KEY\s*,?\s*)?"
    r"\}",
    re.S,
)
auth_replacement = """auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: window.localStorage,
      storageKey: SUPABASE_AUTH_STORAGE_KEY
    }"""
text, auth_count = auth_pattern.subn(auth_replacement, text, count=1)
if auth_count != 1:
    raise SystemExit("Expected exactly one Supabase auth configuration in admin.js")

# Canonical staff restore: browser -> azaad-admin-auth -> server-side active
# clinic_staff authorization. No browser direct clinic_staff query and no
# service-role credential in the browser.
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
    if (!accessToken) {
      try { accessToken = sessionStorage.getItem("azaad_admin_token"); } catch (_) {}
    }
    if (!accessToken) return false;
    if (session?.user?.id) { state.session = session; state.user = session.user; }

    const request = async (token) => fetch(`${SUPABASE_URL}/functions/v1/azaad-admin-auth`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY
      }
    });

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
    try { sessionStorage.setItem("azaad_admin_token", accessToken); } catch (_) {}
    if (session?.refresh_token) {
      try {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: session.refresh_token });
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

# Remove legacy second restore owner and stale startup invocations.
updated = re.sub(r"\nasync function restoreStaff\(\)\s*\{.*?\n\}\n", "\n", updated, flags=re.S)
updated = re.sub(
    r"\n\s*(?:const|let)\s+valid\s*=\s*await\s+restoreStaff\(\);\s*\n\s*if\s*\(\s*valid\s*\)\s*\{.*?\n\s*\}\s*",
    "\n",
    updated,
    flags=re.S,
)

path.write_text(updated, encoding="utf-8")
print("Unified admin auth lifecycle: canonical storage + single restore owner")
