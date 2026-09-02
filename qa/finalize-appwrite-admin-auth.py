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
    await fetch('/api/admin-auth', { method: 'DELETE', credentials: 'include', cache: 'no-store' });
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

def replace_function(source, name, replacement):
    pattern = re.compile(rf'async function {re.escape(name)}\s*\([^)]*\)\s*\{{.*?\n\}}', re.S)
    matches = list(pattern.finditer(source))
    if len(matches) != 1:
        raise SystemExit(f'{name}: expected exactly one function, found {len(matches)}; refusing rewrite')
    return source[:matches[0].start()] + replacement + source[matches[0].end():]

text = replace_function(text, 'login', LOGIN)
text = replace_function(text, 'logout', LOGOUT)
text = replace_function(text, 'restoreStaffProfile', RESTORE_STAFF)

# canonicalize-admin-interactivity-v2 intentionally retires restoreSession; Appwrite owns
# the remaining startup restore through restoreStaffProfile and the HttpOnly session cookie.
startup_pattern = re.compile(
    r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']\s*,\s*async\s*\(\)\s*=>\s*\{.*?\}\s*\)\s*;\s*$',
    re.S,
)
if not startup_pattern.search(text):
    raise SystemExit('Canonical Admin DOMContentLoaded startup block not found')
text = startup_pattern.sub(STARTUP, text, count=1)

# The Appwrite session is an in-memory credential only. Never persist it in sessionStorage/localStorage.
text = re.sub(r'\s*try\s*\{\s*sessionStorage\.setItem\([\s\S]*?\}\s*catch\s*\(_?\)\s*\{\s*\}\s*', '\n', text)

if 'STAFF_LOGIN_FUNCTION' in text:
    raise SystemExit('Legacy STAFF_LOGIN_FUNCTION remains after Appwrite auth transform')
if 'fetch(`${SUPABASE_URL}/functions/v1/staff-login' in text:
    raise SystemExit('Legacy staff-login fetch remains after Appwrite auth transform')
for legacy_auth in (
    'supabase.auth.getSession(',
    'supabase.auth.refreshSession(',
    'supabase.auth.signOut(',
    'supabase.auth.setSession(',
):
    if legacy_auth in text:
        raise SystemExit(f'Legacy Supabase auth runtime remains after Appwrite auth transform: {legacy_auth}')

path.write_text(text, encoding='utf-8')
print('finalize-appwrite-admin-auth.py completed Appwrite session boundary rewrite')
