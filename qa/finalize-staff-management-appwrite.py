from pathlib import Path
import re

path = Path('staff-management.js')
if not path.is_file(): raise SystemExit('staff-management.js is required')
text = path.read_text(encoding='utf-8')

# The canonical source is now Appwrite/HttpOnly + Neon by construction. Keep this
# build stage idempotent so future builds do not attempt to rediscover retired
# Supabase helper boundaries.
if 'AZAAD_STAFF_MANAGEMENT_CANONICAL' in text:
    executable = re.sub(r'/\*.*?\*/', ' ', text, flags=re.S)
    forbidden = [
        r'\bSUPABASE_URL\b', r'\bSUPABASE_PUBLISHABLE_KEY\b',
        r'\bSTAFF_ADMIN_FUNCTION\b', r'\bcreateSupabaseClient\b',
        r'\bsupabase\.auth\.', r'\bwaitForSupabase\b',
        r'https://[^\s"`\']+supabase\.co/functions/v1/staff-admin'
    ]
    for pattern in forbidden:
        if re.search(pattern, executable, flags=re.I):
            raise SystemExit(f'Legacy Supabase staff-management marker remains: {pattern}')
    if "/api/staff-admin" not in text or "credentials:'include'" not in text:
        raise SystemExit('Canonical staff-management runtime is missing the protected Neon API boundary')
    print('finalize-staff-management-appwrite.py: canonical Appwrite/HttpOnly + Neon source already present')
    raise SystemExit(0)


def function_bounds(src, name):
    marker = re.search(rf'async function {re.escape(name)}\s*\(', src)
    if not marker: return None
    paren = src.find('(', marker.start()); depth = 0; quote = None; escape = False; i = paren
    while i < len(src):
        c = src[i]
        if quote:
            if escape: escape=False
            elif c=='\\': escape=True
            elif c==quote: quote=None
            i += 1; continue
        if c in "'\"`": quote=c; i += 1; continue
        if c=='(': depth += 1
        elif c==')':
            depth -= 1
            if depth==0: break
        i += 1
    if depth != 0: return None
    open_brace = src.find('{', i+1)
    if open_brace < 0: return None
    depth = 0; quote=None; escape=False; line_comment=False; block_comment=False; i=open_brace
    while i < len(src):
        c=src[i]; n=src[i+1] if i+1 < len(src) else ''
        if line_comment:
            if c=='\n': line_comment=False
            i+=1; continue
        if block_comment:
            if c=='*' and n=='/': block_comment=False; i+=2; continue
            i+=1; continue
        if quote:
            if escape: escape=False
            elif c=='\\': escape=True
            elif c==quote: quote=None
            i+=1; continue
        if c=='/' and n=='/': line_comment=True; i+=2; continue
        if c=='/' and n=='*': block_comment=True; i+=2; continue
        if c in "'\"`": quote=c; i+=1; continue
        if c=='{': depth+=1
        elif c=='}':
            depth-=1
            if depth==0: return marker.start(), i+1
        i+=1
    return None

start = function_bounds(text, 'createSupabaseClient')
end = function_bounds(text, 'callStaffAdmin')
if not start or not end or start[0] >= end[1]: raise SystemExit('Expected Supabase staff-management helper boundary was not found')
APPWRITE_STAFF_RUNTIME = r'''async function getSession() {
    const adminState = window.AZAAD?.state || {};
    const session = adminState.session || null;
    if (session?.access_token) {
      state.currentSession = session;
      state.currentUser = session.user || null;
      state.currentRole = normalizeRole(adminState.role || adminState.currentRole || adminState.staff?.role || state.currentRole);
      return session;
    }
    const response = await fetch('/api/admin-auth', { method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.authenticated) throw new Error('يجب تسجيل الدخول أولاً.');
    const sessionData = result.session || { user: result.user || null };
    state.currentSession = sessionData;
    state.currentUser = result.user || sessionData.user || null;
    state.currentRole = normalizeRole(result.staff?.role || state.currentRole);
    return sessionData;
  }
  async function getAccessToken() { const session = await getSession(); return session?.access_token || ''; }
  async function callStaffAdmin(action, payload = {}) {
    if (!action) throw new Error('Staff action غير محدد.');
    await getSession();
    const response = await fetch('/api/staff-admin', { method: 'POST', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(payload || {}) }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || result?.message || `Staff API Error ${response.status}`);
    if (result?.error) throw new Error(result.error);
    return result;
  }'''
text = text[:start[0]] + APPWRITE_STAFF_RUNTIME + text[end[1]:]
listener = function_bounds(text, 'setupAuthListener')
if listener:
    APPWRITE_LISTENER = r'''async function setupAuthListener() {
    if (state.authListenerReady) return;
    state.authListenerReady = true;
    const sync = async () => { try { const session = await getSession(); if (!session) return; state.currentSession=session; state.currentUser=session.user||state.currentUser||null; state.currentRole=normalizeRole(window.AZAAD?.state?.role||window.AZAAD?.state?.currentRole||window.AZAAD?.state?.staff?.role||state.currentRole); if (!state.loading) await loadStaff(); } catch (_) {} };
    window.addEventListener('azaad:admin-role-ready', sync);
    window.addEventListener('focus', sync);
  }'''
    text = text[:listener[0]] + APPWRITE_LISTENER + text[listener[1]:]
wait = function_bounds(text, 'waitForSupabase')
if wait: text = text[:wait[0]] + text[wait[1]:]
text = text.replace('      await waitForSupabase();\n\n', '', 1)
text = re.sub(r'\bawait\s+createSupabaseClient\(\);\s*', '', text)
for name in ('SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'STAFF_ADMIN_FUNCTION'):
    text = re.sub(rf'\bconst\s+{name}\s*=\s*[^;]+;\s*', '', text, flags=re.S)
text = re.sub(r'\$\{STAFF_ADMIN_FUNCTION\}', '/api/staff-admin', text)
text = re.sub(r'\bSTAFF_ADMIN_FUNCTION\b', "'/api/staff-admin'", text)
path.write_text(text, encoding='utf-8')
print('finalize-staff-management-appwrite.py completed: Appwrite/HttpOnly staff lifecycle + Neon staff API boundary enforced')
