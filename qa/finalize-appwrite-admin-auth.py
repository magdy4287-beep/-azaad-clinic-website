from pathlib import Path
import re

path = Path('admin.js')
if not path.is_file():
    raise SystemExit('admin.js is required')
text = path.read_text(encoding='utf-8')

LOGIN = r'''async function login(username, password) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password || '');
  if (!cleanUsername) throw new Error('اسم المستخدم مطلوب.');
  if (!cleanPassword) throw new Error('كلمة المرور مطلوبة.');

  const response = await fetch('/api/admin-auth', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
  });

  let result = null;
  try { result = await response.json(); } catch (_) {}
  if (!response.ok) {
    throw new Error(result?.error === 'invalid_credentials' ? 'بيانات الدخول غير صحيحة.' : (result?.message || 'تعذر تسجيل الدخول.'));
  }
  if (result?.provider !== 'appwrite' || !result?.session?.access_token || !result?.staff) {
    throw new Error('جلسة Appwrite غير صالحة.');
  }
  if (result.staff.active === false) throw new Error('حساب الموظف غير فعال.');
  if (!applyStaffRole(result.staff)) throw new Error('دور الموظف غير صالح.');

  state.session = result.session;
  state.user = result.user || result.session.user || null;
  state.provider = 'appwrite';

  if (redirectDoctorIfNeeded()) return;
  await initializeApplication();
}'''

LOGOUT = r'''async function logout() {
  try {
    await Promise.race([
      fetch('/api/admin-auth', {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store'
      }),
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);
  } catch (error) {
    console.warn('Appwrite logout request failed:', error);
  }
  state.session = null;
  state.user = null;
  state.staff = null;
  state.currentRole = null;
  state.permissions = new Set();
  state.initialized = false;
  state.initializing = false;
  window.location.replace('/admin.html');
}'''

RESTORE_STAFF = r'''async function restoreStaffProfile() {
  try {
    const response = await fetch('/api/admin-auth', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return false;
    const result = await response.json();
    if (!result?.authenticated || result?.provider !== 'appwrite' || !result?.staff || !result?.session?.access_token) return false;
    if (result.staff.active === false) return false;
    state.session = result.session;
    state.user = result.user || result.session.user || null;
    state.provider = 'appwrite';
    return applyStaffRole(result.staff);
  } catch (error) {
    console.warn('Appwrite session restore failed:', error);
    return false;
  }
}'''

STARTUP = r'''document.addEventListener("DOMContentLoaded", async () => {
  bindLogin();
  bindLogout();
  bindBookingFilters();
  bindPatientPage();

  try {
    const validStaff = await restoreStaffProfile();
    if (validStaff) {
      await initializeApplication();
    }
  } catch (error) {
    console.error("Application startup error:", error);
    showToast(error?.message || "تعذر استعادة جلسة الدخول.", "error");
  }
});'''

def function_bounds(source, name):
    match = re.search(rf'async function {re.escape(name)}\s*\([^)]*\)\s*\{{', source)
    if not match:
        return None
    brace = source.find('{', match.start())
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ''
        if line_comment:
            if ch == '\n': line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/': block_comment = False; i += 2; continue
            i += 1
            continue
        if quote:
            if escape: escape = False
            elif ch == '\\': escape = True
            elif ch == quote: quote = None
            i += 1
            continue
        if ch == '/' and nxt == '/': line_comment = True; i += 2; continue
        if ch == '/' and nxt == '*': block_comment = True; i += 2; continue
        if ch in "'\"`": quote = ch; i += 1; continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: return match.start(), i + 1
        i += 1
    return None

def replace_function(source, name, replacement):
    bounds = function_bounds(source, name)
    if not bounds:
        raise SystemExit(f'{name}: function not found; refusing rewrite')
    if len(re.findall(rf'async function {re.escape(name)}\s*\(', source)) != 1:
        raise SystemExit(f'{name}: expected exactly one function, refusing rewrite')
    return source[:bounds[0]] + replacement + source[bounds[1]:]

text = replace_function(text, 'login', LOGIN)
text = replace_function(text, 'logout', LOGOUT)

restore_pattern = re.compile(r'async function restoreStaffProfile\s*\([^)]*\)\s*\{', re.S)
restore_matches = list(restore_pattern.finditer(text))
if len(restore_matches) == 1:
    text = replace_function(text, 'restoreStaffProfile', RESTORE_STAFF)
elif len(restore_matches) == 0:
    startup_match = re.search(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']', text)
    if not startup_match:
        raise SystemExit('Cannot install Appwrite restoreStaffProfile: DOMContentLoaded startup not found')
    text = text[:startup_match.start()] + RESTORE_STAFF + '\n\n' + text[startup_match.start():]
else:
    raise SystemExit(f'restoreStaffProfile: expected at most one function, found {len(restore_matches)}; refusing rewrite')

startup_pattern = re.compile(
    r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']\s*,\s*async\s*\(\)\s*=>\s*\{.*?\}\s*\)\s*;\s*$',
    re.S,
)
if not startup_pattern.search(text):
    raise SystemExit('Canonical Admin DOMContentLoaded startup block not found')
text = startup_pattern.sub(STARTUP, text, count=1)

text = re.sub(
    r'\n?const STAFF_LOGIN_FUNCTION\s*=\s*`\$\{SUPABASE_URL\}/functions/v1/staff-login`;\s*\n?',
    '\n',
    text,
    count=1,
)

text = re.sub(r'\s*try\s*\{\s*sessionStorage\.setItem\([\s\S]*?\}\s*catch\s*\(_?\)\s*\{\s*\}\s*', '\n', text)

if 'STAFF_LOGIN_FUNCTION' in text:
    raise SystemExit('Legacy STAFF_LOGIN_FUNCTION remains after Appwrite auth transform')
if 'functions/v1/staff-login' in text:
    raise SystemExit('Legacy staff-login fetch remains after Appwrite auth transform: legacy staff-login endpoint remains')
for legacy_auth in (
    'supabase.auth.getSession(',
    'supabase.auth.refreshSession(',
    'supabase.auth.signOut(',
    'supabase.auth.setSession(',
):
    if legacy_auth in text:
        raise SystemExit(f'Legacy Supabase auth runtime remains after Appwrite auth transform: {legacy_auth}')

if 'async function restoreStaffProfile()' not in text:
    raise SystemExit('Canonical Appwrite restoreStaffProfile() missing after transform')

path.write_text(text, encoding='utf-8')
print('finalize-appwrite-admin-auth.py completed Appwrite session boundary rewrite')
