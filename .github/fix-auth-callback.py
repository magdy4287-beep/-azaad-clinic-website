from pathlib import Path

path = Path('admin.js')
text = path.read_text(encoding='utf-8')
start_marker = 'supabase.auth.onAuthStateChange('
end_marker = '/* ============================================================\n   GLOBAL API'
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('Auth callback markers not found')

replacement = '''supabase.auth.onAuthStateChange(
  (event, session) => {
    // Never perform awaited/network/database work inside the Supabase
    // auth-state callback. The canonical login() path owns post-login
    // initialization; restoreSession() owns startup restoration.
    if (event === "SIGNED_IN") {
      if (!session) return;
      state.session = session;
      state.user = session.user;
      return;
    }

    if (event === "TOKEN_REFRESHED") {
      state.session = session || null;
      state.user = session?.user || null;
      return;
    }

    if (event === "SIGNED_OUT") {
      state.session = null;
      state.user = null;
      state.staff = null;
      state.currentRole = null;
      state.permissions = new Set();
      state.initialized = false;
    }
  }
);

'''

path.write_text(text[:start] + replacement + text[end:], encoding='utf-8')
print('Auth callback replaced with synchronous state-only listener.')
