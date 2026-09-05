from pathlib import Path
import re

path = Path('staff-management.js')
if not path.is_file(): raise SystemExit('staff-management.js is required')
text = path.read_text(encoding='utf-8')


def function_bounds(src, name):
    marker = re.search(rf'async function {re.escape(name)}\s*\(', src)
    if not marker: return None
    open_brace = src.find('{', marker.end())
    if open_brace < 0: return None
    depth = 0; quote = None; escape = False; line_comment = False; block_comment = False; i = open_brace
    while i < len(src):
        c = src[i]; n = src[i + 1] if i + 1 < len(src) else ''
        if line_comment:
            if c == '\n': line_comment = False
            i += 1; continue
        if block_comment:
            if c == '*' and n == '/': block_comment = False; i += 2; continue
            i += 1; continue
        if quote:
            if escape: escape = False
            elif c == '\\': escape = True
            elif c == quote: quote = None
            i += 1; continue
        if c == '/' and n == '/': line_comment = True; i += 2; continue
        if c == '/' and n == '*': block_comment = True; i += 2; continue
        if c in "'\"`": quote = c; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return marker.start(), i + 1
        i += 1
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
    if (!response.ok || !result?.authenticated || !result?.session?.access_token) throw new Error('يجب تسجيل الدخول أولاً.');
    state.currentSession = result.session;
    state.currentUser = result.user || result.session.user || null;
    state.currentRole = normalizeRole(result.staff?.role || state.currentRole);
    return result.session;
  }

  async function getAccessToken() {
    const session = await getSession();
    if (!session?.access_token) throw new Error('يجب تسجيل الدخول أولاً.');
    return session.access_token;
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
for name in ('SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'STAFF_ADMIN_FUNCTION'):
    text = re.sub(rf'\bconst\s+{name}\s*=\s*[^;]+;\s*', '', text, count=1, flags=re.S)

# Strip comments for the final executable contract scan; comments may document the retired provider.
def strip_comments(src):
    out=[]; i=0; quote=None; escape=False
    while i < len(src):
        c=src[i]; n=src[i+1] if i+1 < len(src) else ''
        if quote:
            out.append(c)
            if escape: escape=False
            elif c=='\\': escape=True
            elif c==quote: quote=None
            i += 1; continue
        if c in "'\"`": quote=c; out.append(c); i += 1; continue
        if c=='/' and n=='*':
            e=src.find('*/',i+2); i=len(src) if e<0 else e+2; out.append(' '); continue
        if c=='/' and n=='/':
            e=src.find('\n',i+2); i=len(src) if e<0 else e; out.append('\n'); continue
        out.append(c); i += 1
    return ''.join(out)

executable = strip_comments(text)
for pattern, label in [
    (r'\bconst\s+SUPABASE_(?:URL|PUBLISHABLE_KEY)\s*=', 'legacy Supabase credential declaration'),
    (r'\bconst\s+STAFF_ADMIN_FUNCTION\s*=', 'legacy staff-admin function declaration'),
    (r'\bSTAFF_ADMIN_FUNCTION\b', 'legacy staff-admin function reference'),
    (r'\bsupabase\.auth\.', 'legacy Supabase auth runtime'),
    (r'\bcreateClient\s*\(', 'legacy Supabase client construction'),
    (r'https://[^\s"`\']+supabase\.co/functions/v1/staff-admin', 'legacy staff-admin URL'),
]:
    if re.search(pattern, executable): raise SystemExit(f'Legacy Supabase staff-management marker remains: {label}')

path.write_text(text, encoding='utf-8')
print('finalize-staff-management-appwrite.py completed: staff-management now uses HttpOnly Appwrite session + /api/staff-admin Neon boundary')
