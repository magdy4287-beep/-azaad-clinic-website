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
text = text[:start] + replacement + text[end:]

login_needle = '''  applyStaffRole(
    result.staff
  );

  if (redirectDoctorIfNeeded()) {
    return;
  }

  await initializeApplication();'''
login_replacement = '''  applyStaffRole(
    result.staff
  );

  if (redirectDoctorIfNeeded()) {
    return;
  }

  // The real Supabase session is established at this point. Reveal the authenticated
  // shell before any non-auth initialization so a slow dashboard query cannot make
  // a successful login look like an authentication failure.
  document.getElementById("loginPage")?.classList.add("hidden");
  document.getElementById("adminPage")?.classList.remove("hidden");

  await initializeApplication();'''
if login_needle not in text:
    raise SystemExit('Canonical login post-session marker not found')
text = text.replace(login_needle, login_replacement, 1)

restore_needle = '''  if (redirectDoctorIfNeeded()) {
    return;
  }

  await initializeApplication();'''
restore_replacement = '''  if (redirectDoctorIfNeeded()) {
    return;
  }

  document.getElementById("loginPage")?.classList.add("hidden");
  document.getElementById("adminPage")?.classList.remove("hidden");

  await initializeApplication();'''
if restore_needle not in text:
    raise SystemExit('Canonical session-restore marker not found')
text = text.replace(restore_needle, restore_replacement, 1)

path.write_text(text, encoding='utf-8')
print('Auth callback is synchronous and authenticated shell is revealed immediately after a real session is established.')
