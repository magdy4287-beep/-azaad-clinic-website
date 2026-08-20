from pathlib import Path
import re

path = Path("admin.js")
text = path.read_text(encoding="utf-8")

# Keep the admin client and the login controller on one explicit Supabase
# storage key. This removes ambiguity when more than one supabase-js client
# exists on the page.
if "const SUPABASE_AUTH_STORAGE_KEY = \"sb-derofsthjivlkcdnojww-auth-token\";" not in text:
    marker = 'const SUPABASE_PUBLISHABLE_KEY =\n  "sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa";'
    if marker not in text:
        marker = 'const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa";'
    if marker not in text:
        raise SystemExit("Could not find Supabase publishable key declaration")
    text = text.replace(marker, marker + '\n\nconst SUPABASE_AUTH_STORAGE_KEY = "sb-derofsthjivlkcdnojww-auth-token";', 1)

old_auth = '''    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }'''
new_auth = '''    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: SUPABASE_AUTH_STORAGE_KEY
    }'''
if old_auth in text:
    text = text.replace(old_auth, new_auth, 1)

restore_session_pattern = re.compile(
    r'async function restoreSession\(\)\s*\{.*?\n\}\n\n/\* ============================================================\n   RESTORE STAFF',
    re.S,
)
restore_session = '''async function restoreSession() {
  let session = null;

  try {
    const result = await supabase.auth.getSession();
    session = result?.data?.session || null;
  } catch (error) {
    console.warn("Session restore error; continuing with token fallback:", error);
  }

  if (session?.access_token && session?.user?.id) {
    state.session = session;
    state.user = session.user;
  }

  // Critical reload fallback: sessionStorage survives a reload even when the
  // Supabase client's persistent storage was not hydrated. The token is still
  // verified server-side by restoreStaffProfile()/azaad-admin-auth.
  let fallbackToken = null;
  try {
    fallbackToken = sessionStorage.getItem("azaad_admin_token");
  } catch (_) {}

  if (!session?.access_token && !fallbackToken) {
    return false;
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const validStaff = await restoreStaffProfile();

    if (validStaff) {
      // Token-only fallback is deliberately represented as the minimal local
      // session shape needed by the UI lifecycle. No refresh token is invented.
      if (!state.session) {
        try {
          const token = sessionStorage.getItem("azaad_admin_token");
          if (token) state.session = { access_token: token };
        } catch (_) {}
      }

      if (redirectDoctorIfNeeded()) {
        return true;
      }

      await initializeApplication();
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, attempt * 400));

    try {
      const refreshed = await supabase.auth.getSession();
      const refreshedSession = refreshed?.data?.session;
      if (refreshedSession?.access_token) {
        state.session = refreshedSession;
        state.user = refreshedSession.user;
      }
    } catch (_) {}
  }

  console.warn("Staff profile could not be restored during startup.");
  return false;
}

/* ============================================================
   RESTORE STAFF'''

text, count = restore_session_pattern.subn(restore_session, text, count=1)
if count != 1:
    raise SystemExit("Expected exactly one restoreSession() block")

path.write_text(text, encoding="utf-8")
print("Admin reload restore hardened: persistent storage + reachable sessionStorage fallback")