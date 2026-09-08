from pathlib import Path
import re


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
            i+=1; continue
        if c in "'\"`": quote=c; i+=1; continue
        if c=='(': depth+=1
        elif c==')':
            depth-=1
            if depth==0: break
        i+=1
    if depth != 0: return None
    open_brace = src.find('{', i+1)
    if open_brace < 0: return None
    depth=0; quote=None; escape=False; line_comment=False; block_comment=False; i=open_brace
    while i < len(src):
        c=src[i]; n=src[i+1] if i+1<len(src) else ''
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

admin = Path('admin.js')
if not admin.is_file(): raise SystemExit('admin.js is required')
text = admin.read_text(encoding='utf-8')
restore = function_bounds(text, 'restoreStaffProfile')
if not restore or len(re.findall(r'async function restoreStaffProfile\s*\(', text)) != 1:
    raise SystemExit('Expected exactly one restoreStaffProfile implementation before staff-runtime normalization')
restore_source = text[restore[0]:restore[1]]

# The restore owner must be defined before DOMContentLoaded startup. The prior
# implementation preserved the function's original location, which could itself
# be after the startup listener. Remove the implementation from its old location
# and place the single global owner immediately before the first startup listener.
text_without_restore = text[:restore[0]] + text[restore[1]:]
startup = re.search(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']', text_without_restore)
if not startup:
    raise SystemExit('DOMContentLoaded startup path is required for restore owner placement')
canonical_restore = 'window.AZAAD_RESTORE_STAFF_PROFILE = ' + restore_source + ';\n\n'
text = text_without_restore[:startup.start()] + canonical_restore + text_without_restore[startup.start():]
text = text.replace('const validStaff = await restoreStaffProfile();', 'const validStaff = await window.AZAAD_RESTORE_STAFF_PROFILE();', 1)
if 'await restoreStaffProfile()' in text: raise SystemExit('Legacy unqualified restoreStaffProfile startup call remains')
if text.count('window.AZAAD_RESTORE_STAFF_PROFILE = async function restoreStaffProfile() {') != 1:
    raise SystemExit('Global Appwrite restore owner was not established exactly once')

STAFF_API = r'''async function staffApi(
  action,
  payload = {}
){
  const response = await fetch('/api/staff-admin', {
    method: 'POST', credentials: 'include', cache: 'no-store',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...(payload || {}) })
  });
  let body = {};
  try { body = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
  return body;
}'''
html = Path('admin.html')
if not html.is_file(): raise SystemExit('admin.html is required')
html_text = html.read_text(encoding='utf-8')
bounds = function_bounds(html_text, 'staffApi')
if bounds:
    html_text = html_text[:bounds[0]] + STAFF_API + html_text[bounds[1]:]
    html.write_text(html_text, encoding='utf-8')

legacy_url = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/staff-admin'
changed = 0
for candidate in [*Path('.').glob('*.js'), *Path('.').glob('*.html')]:
    value = candidate.read_text(encoding='utf-8')
    updated = value.replace(legacy_url, '/api/staff-admin')
    if updated != value:
        candidate.write_text(updated, encoding='utf-8')
        changed += 1
print(f'retired Supabase staff-admin URL from {changed} executable surface(s)')

for candidate in [*Path('.').glob('*.js'), *Path('.').glob('*.html')]:
    value = candidate.read_text(encoding='utf-8')
    if legacy_url in value and not value.lstrip().startswith(('/*', '<!--')):
        raise SystemExit(f'Legacy staff-admin URL remains in {candidate}')

for name, value in [('admin.js', text), ('admin.html', html_text)]:
    if 'supabase.auth.' in value: raise SystemExit(f'Legacy Supabase auth runtime remains in {name}')
    if 'SUPABASE_PUBLISHABLE_KEY' in value: raise SystemExit(f'Legacy Supabase publishable key remains in executable {name}')

print('retire-legacy-admin-staff-runtime.py completed: global Appwrite restore owner relocated before DOM startup + Neon staff API boundary enforced')