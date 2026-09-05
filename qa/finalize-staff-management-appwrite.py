from pathlib import Path
import re

path = Path('staff-management.js')
if not path.is_file(): raise SystemExit('staff-management.js is required')
text = path.read_text(encoding='utf-8')


def function_bounds(src, name):
    marker = re.search(rf'async function {re.escape(name)}\s*\(', src)
    if not marker: return None
    paren = src.find('(', marker.start())
    depth = 0; quote = None; escape = False; i = paren
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

# Retire the whole Supabase helper region.
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

  async function getAccessToken() {
    const session = await getSession();
    return session?.access_token || '';
  }

  async function callStaffAdmin(action, payload = {}) {
    if (!action) throw new Error('Staff action غير محدد.');
    await getSession();
    const response = await fetch('/api/staff-admin', {
      method: 'POST', credentials: 'include', cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...(payload || {}) })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || result?.message || `Staff API Error ${response.status}`);
    if (result?.error) throw new Error(result.error);
    return result;
  }'''
text = text[:start[0]] + APPWRITE_STAFF_RUNTIME + text[end[1]:]

# Replace Supabase auth listener with an Appwrite/HttpOnly session synchronizer.
listener = function_bounds(text, 'setupAuthListener')
if listener:
    APPWRITE_LISTENER = r'''async function setupAuthListener() {
    if (state.authListenerReady) return;
    state.authListenerReady = true;
    const sync = async () => {
      try {
        const session = await getSession();
        if (!session) return;
        state.currentSession = session;
        state.currentUser = session.user || state.currentUser || null;
        state.currentRole = normalizeRole(window.AZAAD?.state?.role || window.AZAAD?.state?.currentRole || window.AZAAD?.state?.staff?.role || state.currentRole);
        if (!state.loading) await loadStaff();
      } catch (_) {
        // Authentication boundary owns user-facing auth errors; staff runtime remains non-blocking.
      }
    };
    window.addEventListener('azaad:admin-role-ready', sync);
    window.addEventListener('focus', sync);
  }'''
    text = text[:listener[0]] + APPWRITE_LISTENER + text[listener[1]:]

wait = function_bounds(text, 'waitForSupabase')
if wait:
    text = text[:wait[0]] + text[wait[1]:]

# Initialization must never wait for a Supabase provider.
text = text.replace('      await waitForSupabase();\n\n', '', 1)

# If the old listener call still references a provider, it is a hard failure.
text = re.sub(r'\bawait\s+createSupabaseClient\(\);\s*', '', text)
text = re.sub(r'\bconst\s+client\s*=\s*await\s+createSupabaseClient\(\);', 'const client = null;', text)
for name in ('SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'STAFF_ADMIN_FUNCTION'):
    text = re.sub(rf'\bconst\s+{name}\s*=\s*[^;]+;\s*', '', text, flags=re.S)
text = re.sub(r'\$\{STAFF_ADMIN_FUNCTION\}', '/api/staff-admin', text)
text = re.sub(r'\bSTAFF_ADMIN_FUNCTION\b', "'/api/staff-admin'", text)


def strip_comments(src):
    out=[]; i=0; quote=None; escape=False
    while i < len(src):
        c=src[i]; n=src[i+1] if i+1<len(src) else ''
        if quote:
            out.append(c)
            if escape: escape=False
            elif c=='\\': escape=True
            elif c==quote: quote=None
            i+=1; continue
        if c in "'\"`": quote=c; out.append(c); i+=1; continue
        if c=='/' and n=='*':
            e=src.find('*/',i+2); i=len(src) if e<0 else e+2; out.append(' '); continue
        if c=='/' and n=='/':
            e=src.find('\n',i+2); i=len(src) if e<0 else e; out.append('\n'); continue
        out.append(c); i+=1
    return ''.join(out)

executable = strip_comments(text)
for pattern, label in [
    (r'\bconst\s+SUPABASE_(?:URL|PUBLISHABLE_KEY)\s*=', 'legacy Supabase credential declaration'),
    (r'\bconst\s+STAFF_ADMIN_FUNCTION\s*=', 'legacy staff-admin function declaration'),
    (r'\bSTAFF_ADMIN_FUNCTION\b', 'legacy staff-admin function reference'),
    (r'\bsupabase\.auth\.', 'legacy Supabase auth runtime'),
    (r'\bcreateClient\s*\(', 'legacy Supabase client construction'),
    (r'\bwaitForSupabase\b', 'legacy Supabase initialization waiter'),
    (r'https://[^\s"`\']+supabase\.co/functions/v1/staff-admin', 'legacy staff-admin URL'),
]:
    if re.search(pattern, executable): raise SystemExit(f'Legacy Supabase staff-management marker remains: {label}')

path.write_text(text, encoding='utf-8')
print('finalize-staff-management-appwrite.py completed: Appwrite/HttpOnly staff lifecycle + Neon staff API boundary enforced')
