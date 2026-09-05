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
  let result = null; try { result = await response.json(); } catch (_) {}
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

RESTORE = r'''async function restoreStaffProfile() {
  const retryDelays = [0, 150, 350]; let lastStatus = null;
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
    console.warn('Appwrite session restore unavailable after bounded retries:', lastStatus); return false;
  } catch (error) { console.warn('Appwrite session restore failed:', error); return false; }
}'''

STARTUP = r'''document.addEventListener("DOMContentLoaded", async () => {
  bindLogin(); window.AZAAD_LOGIN_CONTROLLER_READY = true; bindLogout(); bindBookingFilters(); bindPatientPage();
  try { const validStaff = await restoreStaffProfile(); if (validStaff) await initializeApplication(); }
  catch (error) { console.error("Application startup error:", error); showToast(error?.message || "تعذر استعادة جلسة الدخول.", "error"); }
});'''

def bounds(src, name):
    m = re.search(rf'async function {re.escape(name)}\s*\([^)]*\)\s*\{{', src)
    if not m: return None
    i = src.find('{', m.start()); depth = 0; quote = None; esc = False; line = False; block = False
    while i < len(src):
        c = src[i]; n = src[i+1] if i+1 < len(src) else ''
        if line:
            if c == '\n': line = False
            i += 1; continue
        if block:
            if c == '*' and n == '/': block = False; i += 2; continue
            i += 1; continue
        if quote:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == quote: quote = None
            i += 1; continue
        if c == '/' and n == '/': line = True; i += 2; continue
        if c == '/' and n == '*': block = True; i += 2; continue
        if c in "'\"`": quote = c; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return m.start(), i + 1
        i += 1
    return None

def replace_fn(src, name, replacement):
    b = bounds(src, name)
    if not b or len(re.findall(rf'async function {re.escape(name)}\s*\(', src)) != 1: raise SystemExit(f'{name}: canonical function boundary invalid')
    return src[:b[0]] + replacement + src[b[1]:]

text = replace_fn(text, 'login', LOGIN)
text = replace_fn(text, 'logout', LOGOUT)
rc = len(re.findall(r'async function restoreStaffProfile\s*\(', text))
if rc == 1: text = replace_fn(text, 'restoreStaffProfile', RESTORE)
elif rc == 0:
    marker = re.search(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']', text)
    if not marker: raise SystemExit('DOMContentLoaded startup not found')
    text = text[:marker.start()] + RESTORE + '\n\n' + text[marker.start():]
else: raise SystemExit(f'restoreStaffProfile duplicate count={rc}')

startup = re.compile(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']\s*,\s*async\s*\(\)\s*=>\s*\{.*?\}\s*\)\s*;\s*$', re.S)
if not startup.search(text): raise SystemExit('Canonical DOMContentLoaded startup block not found')
text = startup.sub(STARTUP, text, count=1)

text = re.sub(r'^\s*import\s*\{\s*createClient\s*\}\s*from\s*["\']https://esm\.sh/@supabase/supabase-js@2["\'];?\s*\n', '', text, count=1, flags=re.M)
text = re.sub(r'\n?\s*const STAFF_LOGIN_FUNCTION\s*=\s*`[^`]*?/functions/v1/staff-login`;\s*\n?', '\n', text, count=1)

# Remove createClient(...) by balanced parentheses; then remove every legacy SUPABASE_* const statement.
clients = list(re.finditer(r'\b(?:const|let|var)\s+supabase\s*=\s*createClient\s*\(', text))
if len(clients) > 1: raise SystemExit(f'Multiple Supabase clients remain: {len(clients)}')
if clients:
    m = clients[0]; i = m.end(); depth = 1; quote = None; esc = False; line = False; block = False
    while i < len(text) and depth:
        c = text[i]; n = text[i+1] if i+1 < len(text) else ''
        if line:
            if c == '\n': line = False
            i += 1; continue
        if block:
            if c == '*' and n == '/': block = False; i += 2; continue
            i += 1; continue
        if quote:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == quote: quote = None
            i += 1; continue
        if c == '/' and n == '/': line = True; i += 2; continue
        if c == '/' and n == '*': block = True; i += 2; continue
        if c in "'\"`": quote = c; i += 1; continue
        if c == '(': depth += 1
        elif c == ')': depth -= 1
        i += 1
    if depth: raise SystemExit('Unbalanced createClient(...)')
    text = text[:m.start()] + text[i + (1 if i < len(text) and text[i] == ';' else 0):]


def remove_const_statements(src):
    pattern = re.compile(r'\b(?:const|let|var)\s+SUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY|SERVICE_ROLE_KEY)\s*=')
    matches = list(pattern.finditer(src))
    for m in reversed(matches):
        i = m.end(); quote = None; esc = False; line = False; block = False
        while i < len(src):
            c = src[i]; n = src[i+1] if i+1 < len(src) else ''
            if line:
                if c == '\n': line = False
                i += 1; continue
            if block:
                if c == '*' and n == '/': block = False; i += 2; continue
                i += 1; continue
            if quote:
                if esc: esc = False
                elif c == '\\': esc = True
                elif c == quote: quote = None
                i += 1; continue
            if c == '/' and n == '/': line = True; i += 2; continue
            if c == '/' and n == '*': block = True; i += 2; continue
            if c in "'\"`": quote = c; i += 1; continue
            if c == ';': i += 1; break
            i += 1
        src = src[:m.start()] + src[i:]
    return src

text = remove_const_statements(text)

legacy_blocks = [
 (r'/\* ============================================================\n\s*SAFE QUERY\n\s*============================================================ \*/.*?(?=/\* ============================================================\n\s*PERMISSIONS)', 'safeQuery'),
 (r'/\* ============================================================\n\s*RESTORE SESSION\n\s*============================================================ \*/\s*async function restoreSession\(\).*?(?=/\* ============================================================\n\s*RESTORE STAFF)', 'restoreSession'),
]
for pattern, label in legacy_blocks:
    text, removed = re.subn(pattern, '', text, count=1, flags=re.S)
    if not removed: print(f'legacy {label} already retired; continuing idempotently')

text, removed = re.subn(r'/\* ============================================================\n\s*AUTH STATE\n\s*============================================================ \*/\s*supabase\.auth\.onAuthStateChange\([\s\S]*?\n\);\s*\n', '', text, count=1, flags=re.S)
if not removed: print('legacy Supabase auth-state listener already retired; continuing idempotently')
text, removed = re.subn(r'window\.AZAAD\s*=\s*\{\s*supabase,\s*', 'window.AZAAD = {\n  ', text, count=1)
if not removed: print('global Supabase exposure already retired; continuing idempotently')

if 'STAFF_LOGIN_FUNCTION' in text or 'functions/v1/staff-login' in text: raise SystemExit('Legacy staff-login endpoint remains')
for x in ('supabase.auth.getSession(', 'supabase.auth.refreshSession(', 'supabase.auth.signOut(', 'supabase.auth.setSession('):
    if x in text: raise SystemExit(f'Legacy Supabase auth runtime remains: {x}')

masked=[]; i=0
while i < len(text):
    c=text[i]; n=text[i+1] if i+1<len(text) else ''
    if c=='/' and n=='*':
        e=text.find('*/',i+2); i=len(text) if e<0 else e+2; masked.append(' '); continue
    if c=='/' and n=='/':
        e=text.find('\n',i+2); i=len(text) if e<0 else e; masked.append('\n'); continue
    if c in "'\"`":
        q=c; i+=1
        while i<len(text):
            if text[i]=='\\': i+=2; continue
            if text[i]==q: i+=1; break
            i+=1
        masked.append(' '); continue
    masked.append(c); i+=1
masked_text=''.join(masked)
for pattern in (r'\bsupabase\s*\.', r'\b(?:const|let|var)\s+supabase\b', r'\bsupabase\s*=', r'[,{]\s*supabase\s*(?:[,}])', r'\bSUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY|SERVICE_ROLE_KEY)\b'):
    if re.search(pattern, masked_text, re.I): raise SystemExit(f'Executable Supabase runtime reference remains in canonical Admin controller: {pattern}')

if 'async function restoreStaffProfile()' not in text: raise SystemExit('Canonical Appwrite restoreStaffProfile() missing')
if 'retryDelays = [0, 150, 350]' not in text: raise SystemExit('Bounded Appwrite restore retry contract missing')
if text.count('window.AZAAD_LOGIN_CONTROLLER_READY = true;') != 1: raise SystemExit('Admin login readiness marker must be unique')
path.write_text(text, encoding='utf-8')
print('finalize-appwrite-admin-auth.py completed Appwrite session boundary rewrite; Supabase runtime retired')
