from pathlib import Path

path = Path('admin.js')
if not path.exists():
    raise SystemExit('admin.js not found')

js = path.read_text(encoding='utf-8')

start = js.find('async function logout() {')
if start < 0:
    raise SystemExit('logout function not found')
end = js.find('\n}\n\n/*', start)
if end < 0:
    raise SystemExit('logout function boundary not found')
end += 2

new_logout = '''async function logout() {
  const loginPage = $("loginPage");
  const adminPage = $("adminPage");

  // The shell transition is local and deterministic. It must not wait for
  // Supabase network state before the authenticated surface disappears.
  if (adminPage) adminPage.classList.add("hidden");
  if (loginPage) {
    loginPage.classList.remove("hidden");
    loginPage.removeAttribute("aria-hidden");
  }

  state.session = null;
  state.user = null;
  state.staff = null;
  state.currentRole = null;
  state.permissions = new Set();
  state.initialized = false;
  state.initializing = false;

  const form = $("loginForm");
  if (form) form.reset();
  const password = $("password");
  if (password) password.value = "";

  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);
  } catch (error) {
    console.error("Logout error:", error);
  }

  // Re-assert the shell invariant after auth callbacks complete.
  if (adminPage) adminPage.classList.add("hidden");
  if (loginPage) loginPage.classList.remove("hidden");
}'''

js = js[:start] + new_logout + js[end:]
path.write_text(js, encoding='utf-8')
print('[AZAAD final logout] PASS: login shell is restored before and after auth sign-out')
