from pathlib import Path
import re

PATH = Path("admin.js")
if not PATH.is_file(): raise SystemExit("admin.js is required")
text = PATH.read_text(encoding="utf-8")

RESTORE = r'''async function restoreStaffProfile() {
  const retryDelays = [0, 150, 350]; let lastStatus = null;
  try {
    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt]) await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      const response = await fetch('/api/admin-auth', { method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
      lastStatus = response.status;
      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        if (!result?.authenticated || result?.provider !== 'appwrite' || !result?.staff || result.staff.active === false) return false;
        state.session = Object.freeze({ provider: 'appwrite' });
        state.user = result.user || { id: result.staff.auth_user_id || null, email: result.staff.email || null };
        state.provider = 'appwrite';
        return applyStaffRole(result.staff);
      }
      if (![401, 408, 429, 500, 502, 503, 504].includes(response.status)) return false;
    }
    console.warn('Appwrite session restore unavailable after bounded retries:', lastStatus); return false;
  } catch (error) { console.warn('Appwrite session restore failed:', error); return false; }
}'''
LOGIN = r'''async function login(username, password) {
  const cleanUsername = String(username || '').trim().toLowerCase(); const cleanPassword = String(password || '');
  if (!cleanUsername) throw new Error('اسم المستخدم مطلوب.'); if (!cleanPassword) throw new Error('كلمة المرور مطلوبة.');
  const response = await fetch('/api/admin-auth', { method: 'POST', credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: cleanUsername, password: cleanPassword }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error === 'invalid_credentials' ? 'بيانات الدخول غير صحيحة.' : (result?.message || 'تعذر تسجيل الدخول.'));
  if (result?.provider !== 'appwrite' || !result?.authenticated || !result?.staff) throw new Error('جلسة Appwrite غير صالحة.');
  if (result.staff.active === false) throw new Error('حساب الموظف غير فعال.'); if (!applyStaffRole(result.staff)) throw new Error('دور الموظف غير صالح.');
  state.session = Object.freeze({ provider: 'appwrite' }); state.user = result.user || { id: result.staff.auth_user_id || null, email: result.staff.email || null }; state.provider = 'appwrite';
  if (redirectDoctorIfNeeded()) return; await initializeApplication();
}'''
LOGOUT = r'''async function logout() {
  try { await Promise.race([fetch('/api/admin-auth', { method: 'DELETE', credentials: 'include', cache: 'no-store' }), new Promise(resolve => setTimeout(resolve, 2500))]); } catch (error) { console.warn('Appwrite logout request failed:', error); }
  state.session = null; state.user = null; state.staff = null; state.currentRole = null; state.permissions = new Set(); state.initialized = false; state.initializing = false; state.provider = null; window.location.replace('/admin.html');
}'''

def bounds(src, name):
    matches = list(re.finditer(rf"(?:async )?function {re.escape(name)}\s*\([^)]*\)\s*\{{", src))
    if len(matches) != 1: raise SystemExit(f"{name}: expected exactly one function, found {len(matches)}")
    start = matches[0].start(); i = src.find("{", start); depth = 0; quote = None; escape = False; line = block = False
    while i < len(src):
        c = src[i]; n = src[i + 1] if i + 1 < len(src) else ''
        if line:
            if c == '\n': line = False
        elif block:
            if c == '*' and n == '/': block = False; i += 1
        elif quote:
            if escape: escape = False
            elif c == '\\': escape = True
            elif c == quote: quote = None
        elif c in "'\"`": quote = c
        elif c == '/' and n == '/': line = True; i += 1
        elif c == '/' and n == '*': block = True; i += 1
        elif c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return start, i + 1
        i += 1
    raise SystemExit(f"{name}: unterminated function")

def replace_fn(src, name, replacement):
    start, end = bounds(src, name); return src[:start] + replacement + src[end:]

# Normalize any old restore owner. If earlier cleanup has already removed the owner,
# create exactly one canonical owner immediately before initialization.
if 'async function restoreStaffProfile(' in text:
    text = replace_fn(text, 'restoreStaffProfile', RESTORE)
elif 'async function restoreStaff(' in text:
    text = replace_fn(text, 'restoreStaff', RESTORE)
else:
    marker = re.search(r'(?=/\*\s*=+\s*\n\s*INITIALIZE\b)', text)
    if marker:
        text = text[:marker.start()] + RESTORE + '\n\n' + text[marker.start():]
    else:
        marker = re.search(r'(?=function\s+initializeApplication\s*\()', text)
        if not marker: raise SystemExit('No canonical Admin initialization insertion point found')
        text = text[:marker.start()] + RESTORE + '\n\n' + text[marker.start():]

if 'async function login(' in text: text = replace_fn(text, 'login', LOGIN)
if 'async function logout(' in text: text = replace_fn(text, 'logout', LOGOUT)

text = re.sub(r'^\s*import\s*\{\s*createClient\s*\}\s*from\s*["\']https://esm\.sh/@supabase/supabase-js@2["\'];?\s*\n', '', text, count=1, flags=re.M)
text = re.sub(r'\n?\s*const STAFF_LOGIN_FUNCTION\s*=\s*`[^`]*?/functions/v1/staff-login`;\s*\n?', '\n', text, count=1)
text = re.sub(r'\n?\s*const SUPABASE_URL\s*=\s*[^;]+;\s*\n?', '\n', text, count=1)
text = re.sub(r'\n?\s*const SUPABASE_PUBLISHABLE_KEY\s*=\s*[^;]+;\s*\n?', '\n', text, count=1)
text = re.sub(r'\n?\s*const\s+supabase\s*=\s*createClient\([\s\S]*?\n\);\s*\n?', '\n', text, count=1)
text = re.sub(r'/\* ============================================================\n\s*AUTH STATE\n\s*============================================================ \*/[\s\S]*?supabase\.auth\.onAuthStateChange\([\s\S]*?\n\);\s*\n?', '\n', text, count=1)
text = re.sub(r'\bwindow\.AZAAD\s*=\s*\{\s*supabase,\s*', 'window.AZAAD = {\n  ', text, count=1)
text = re.sub(r'/\* ============================================================\n\s*RESTORE SESSION\n\s*============================================================ \*/[\s\S]*?(?=/\* ============================================================\n\s*RESTORE STAFF)', '\n', text, count=1)

for pattern in (r'\bsupabase\.auth\.(?:getSession|refreshSession|signOut|setSession)\s*\(', r'functions/v1/staff-login', r'\bSUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY|SERVICE_ROLE_KEY|AUTH_STORAGE_KEY)\b'):
    if re.search(pattern, text, flags=re.I): raise SystemExit(f"Legacy staff-login / Supabase browser auth marker remains: {pattern}")
if text.count('async function restoreStaffProfile(') != 1: raise SystemExit('Canonical Appwrite restoreStaffProfile owner must exist exactly once')
PATH.write_text(text, encoding='utf-8')
print('finalize-appwrite-admin-auth.py: single cookie-only Appwrite auth owner established')
