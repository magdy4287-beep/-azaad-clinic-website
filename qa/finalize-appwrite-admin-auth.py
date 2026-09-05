from pathlib import Path
import re

path = Path('admin.js')
if not path.is_file(): raise SystemExit('admin.js is required')
text = path.read_text(encoding='utf-8')

LOGIN = r'''async function login(username, password) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password || '');
  if (!cleanUsername) throw new Error('اسم المستخدم مطلوب.');
  if (!cleanPassword) throw new Error('كلمة المرور مطلوبة.');
  const response = await fetch('/api/admin-auth', { method: 'POST', credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: cleanUsername, password: cleanPassword }) });
  let result = null;
  try { result = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(result?.error === 'invalid_credentials' ? 'بيانات الدخول غير صحيحة.' : (result?.message || 'تعذر تسجيل الدخول.'));
  if (result?.provider !== 'appwrite' || !result?.session?.access_token || !result?.staff) throw new Error('جلسة Appwrite غير صالحة.');
  if (result.staff.active === false) throw new Error('حساب الموظف غير فعال.');
  if (!applyStaffRole(result.staff)) throw new Error('دور الموظف غير صالح.');
  state.session = result.session; state.user = result.user || result.session.user || null; state.provider = 'appwrite';
  if (redirectDoctorIfNeeded()) return;
  await initializeApplication();
}'''

LOGOUT = r'''async function logout() {
  try { await Promise.race([fetch('/api/admin-auth', { method: 'DELETE', credentials: 'include', cache: 'no-store' }), new Promise(resolve => setTimeout(resolve, 2500))]); }
  catch (error) { console.warn('Appwrite logout request failed:', error); }
  state.session = null; state.user = null; state.staff = null; state.currentRole = null; state.permissions = new Set(); state.initialized = false; state.initializing = false;
  window.location.replace('/admin.html');
}'''

RESTORE_STAFF = r'''async function restoreStaffProfile() {
  const retryDelays = [0, 150, 350];
  let lastStatus = null;
  try {
    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt]) await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      const response = await fetch('/api/admin-auth', { method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
      lastStatus = response.status;
      if (response.ok) {
        const result = await response.json();
        if (!result?.authenticated || result?.provider !== 'appwrite' || !result?.staff || !result?.session?.access_token) return false;
        if (result.staff.active === false) return false;
        state.session = result.session; state.user = result.user || result.session.user || null; state.provider = 'appwrite';
        return applyStaffRole(result.staff);
      }
      if (![401, 408, 429, 500, 502, 503, 504].includes(response.status)) return false;
    }
    console.warn('Appwrite session restore unavailable after bounded retries:', lastStatus);
    return false;
  } catch (error) { console.warn('Appwrite session restore failed:', error); return false; }
}'''

STARTUP = r'''document.addEventListener("DOMContentLoaded", async () => {
  bindLogin();
  window.AZAAD_LOGIN_CONTROLLER_READY = true;
  bindLogout();
  bindBookingFilters();
  bindPatientPage();
  try {
    const validStaff = await restoreStaffProfile();
    if (validStaff) await initializeApplication();
  } catch (error) {
    console.error("Application startup error:", error);
    showToast(error?.message || "تعذر استعادة جلسة الدخول.", "error");
  }
});'''

def function_bounds(source, name):
    match = re.search(rf'async function {re.escape(name)}\s*\([^)]*\)\s*\{{', source)
    if not match: return None
    i = source.find('{', match.start()); depth = 0; quote = None; escape = False; line = False; block = False
    while i < len(source):
        ch = source[i]; nxt = source[i + 1] if i + 1 < len(source) else ''
        if line:
            if ch == '\n': line = False
            i += 1; continue
        if block:
            if ch == '*' and nxt == '/': block = False; i += 2; continue
            i += 1; continue
        if quote:
            if escape: escape = False
            elif ch == '\\': escape = True
            elif ch == quote: quote = None
            i += 1; continue
        if ch == '/' and nxt == '/': line = True; i += 2; continue
        if ch == '/' and nxt == '*': block = True; i += 2; continue
        if ch in "'\"`": quote = ch; i += 1; continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: return match.start(), i + 1
        i += 1
    return None

def replace_function(source, name, replacement):
    bounds = function_bounds(source, name)
    if not bounds: raise SystemExit(f'{name}: function not found; refusing rewrite')
    if len(re.findall(rf'async function {re.escape(name)}\s*\(', source)) != 1: raise SystemExit(f'{name}: expected exactly one function, refusing rewrite')
    return source[:bounds[0]] + replacement + source[bounds[1]:]

text = replace_function(text, 'login', LOGIN)
text = replace_function(text, 'logout', LOGOUT)

restore_count = len(re.findall(r'async function restoreStaffProfile\s*\(', text))
if restore_count == 1:
    text = replace_function(text, 'restoreStaffProfile', RESTORE_STAFF)
elif restore_count == 0:
    marker = re.search(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']', text)
    if not marker: raise SystemExit('Cannot install Appwrite restoreStaffProfile: DOMContentLoaded startup not found')
    text = text[:marker.start()] + RESTORE_STAFF + '\n\n' + text[marker.start():]
else: raise SystemExit(f'restoreStaffProfile: expected at most one function, found {restore_count}; refusing rewrite')

startup_pattern = re.compile(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']\s*,\s*async\s*\(\)\s*=>\s*\{.*?\}\s*\)\s*;\s*$', re.S)
if not startup_pattern.search(text): raise SystemExit('Canonical Admin DOMContentLoaded startup block not found')
text = startup_pattern.sub(STARTUP, text, count=1)

text = re.sub(r'^\s*import\s*\{\s*createClient\s*\}\s*from\s*["\']https://esm\.sh/@supabase/supabase-js@2["\'];?\s*\n', '', text, count=1, flags=re.M)
text = re.sub(r'\n?\s*const STAFF_LOGIN_FUNCTION\s*=\s*`[^`]*?/functions/v1/staff-login`;\s*\n?', '\n', text, count=1)

# Robustly retire createClient(...) even when previous transforms changed the URL/key literals.
client_matches = list(re.finditer(r'\bconst\s+supabase\s*=\s*createClient\s*\(', text))
if len(client_matches) > 1: raise SystemExit(f'Multiple canonical Admin Supabase clients remain: {len(client_matches)}')
if client_matches:
    m = client_matches[0]; i = m.end(); depth = 1; quote = None; escape = False; line = False; block = False
    while i < len(text) and depth:
        ch = text[i]; nxt = text[i + 1] if i + 1 < len(text) else ''
        if line:
            if ch == '\n': line = False
            i += 1; continue
        if block:
            if ch == '*' and nxt == '/': block = False; i += 2; continue
            i += 1; continue
        if quote:
            if escape: escape = False
            elif ch == '\\': escape = True
            elif ch == quote: quote = None
            i += 1; continue
        if ch == '/' and nxt == '/': line = True; i += 2; continue
        if ch == '/' and nxt == '*': block = True; i += 2; continue
        if ch in "'\"`": quote = ch; i += 1; continue
        if ch == '(': depth += 1
        elif ch == ')': depth -= 1
        i += 1
    if depth != 0: raise SystemExit('Unbalanced Supabase createClient(...) call; refusing rewrite')
    end = i + (1 if i < len(text) and text[i] == ';' else 0)
    prefix = text[:m.start()]
    prefix = re.sub(r'(?:\s*const\s+SUPABASE_URL\s*=\s*[^;]+;\s*)?(?:const\s+SUPABASE_(?:PUBLISHABLE_KEY|ANON_KEY|SERVICE_ROLE_KEY)\s*=\s*[^;]+;\s*)?$', '', prefix, count=1, flags=re.S)
    text = prefix + '\n' + text[end:]
else:
    text = re.sub(r'^\s*const\s+SUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY|SERVICE_ROLE_KEY)\s*=.*?;\s*$', '', text, flags=re.M)

legacy_blocks = [
    (r'/\* ============================================================\n\s*SAFE QUERY\n\s*============================================================ \*/.*?(?=/\* ============================================================\n\s*PERMISSIONS)', 'safeQuery'),
    (r'/\* ============================================================\n\s*RESTORE SESSION\n\s*============================================================ \*/\s*async function restoreSession\(\).*?(?=/\* ============================================================\n\s*RESTORE STAFF)', 'restoreSession'),
]
for pattern, label in legacy_blocks:
    text, removed = re.subn(pattern, '', text, count=1, flags=re.S)
    if removed == 0: print(f'legacy {label} already retired by an earlier canonical transform; continuing idempotently')

text, removed_auth_listener = re.subn(r'/\* ============================================================\n\s*AUTH STATE\n\s*============================================================ \*/\s*supabase\.auth\.onAuthStateChange\([\s\S]*?\n\);\s*\n', '', text, count=1, flags=re.S)
if removed_auth_listener == 0: print('legacy Supabase auth-state listener already retired by an earlier canonical transform; continuing idempotently')

text, removed_global_supabase = re.subn(r'window\.AZAAD\s*=\s*\{\s*supabase,\s*', 'window.AZAAD = {\n  ', text, count=1)
if removed_global_supabase == 0: print('global Supabase exposure already retired by an earlier canonical transform; continuing idempotently')

text = re.sub(r'\s*try\s*\{\s*sessionStorage\.setItem\([\s\S]*?\}\s*catch\s*\(_?\)\s*\{\s*\}\s*', '\n', text)
if 'STAFF_LOGIN_FUNCTION' in text or 'functions/v1/staff-login' in text: raise SystemExit('Legacy staff-login endpoint remains after Appwrite auth transform')
for legacy_auth in ('supabase.auth.getSession(', 'supabase.auth.refreshSession(', 'supabase.auth.signOut(', 'supabase.auth.setSession('):
    if legacy_auth in text: raise SystemExit(f'Legacy Supabase auth runtime remains after Appwrite auth transform: {legacy_auth}')

masked = []; i = 0
while i < len(text):
    ch = text[i]; nxt = text[i + 1] if i + 1 < len(text) else ''
    if ch == '/' and nxt == '*':
        end = text.find('*/', i + 2); i = len(text) if end < 0 else end + 2; masked.append(' '); continue
    if ch == '/' and nxt == '/':
        end = text.find('\n', i + 2); i = len(text) if end < 0 else end; masked.append('\n'); continue
    if ch in "'\"`":
        quote = ch; i += 1
        while i < len(text):
            if text[i] == '\\': i += 2; continue
            if text[i] == quote: i += 1; break
            i += 1
        masked.append(' '); continue
    masked.append(ch); i += 1
masked_text = ''.join(masked)
for pattern in (r'\bsupabase\s*\.', r'\b(?:const|let|var)\s+supabase\b', r'\bsupabase\s*=', r'[,{]\s*supabase\s*(?:[,}])', r'\bSUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY|SERVICE_ROLE_KEY)\b'):
    if re.search(pattern, masked_text, re.I): raise SystemExit(f'Executable Supabase runtime reference remains in canonical Admin controller: {pattern}')

if 'async function restoreStaffProfile()' not in text: raise SystemExit('Canonical Appwrite restoreStaffProfile() missing after transform')
if 'retryDelays = [0, 150, 350]' not in text: raise SystemExit('Bounded Appwrite restore retry contract missing')
if text.count('window.AZAAD_LOGIN_CONTROLLER_READY = true;') != 1: raise SystemExit('Admin login readiness marker must be unique')
path.write_text(text, encoding='utf-8')
print('finalize-appwrite-admin-auth.py completed Appwrite session boundary rewrite; Supabase executable runtime retired')
