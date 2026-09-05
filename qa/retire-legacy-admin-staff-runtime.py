from pathlib import Path
import re

path = Path('admin.js')
if not path.is_file():
    raise SystemExit('admin.js is required')
text = path.read_text(encoding='utf-8')

restore_pattern = r'async function restoreStaffProfile\(\)\s*\{'
if len(re.findall(restore_pattern, text)) != 1:
    raise SystemExit('Expected exactly one restoreStaffProfile implementation before staff-runtime normalization')
text = re.sub(restore_pattern, 'window.AZAAD_RESTORE_STAFF_PROFILE = async function restoreStaffProfile() {', text, count=1)
text = text.replace('const validStaff = await restoreStaffProfile();', 'const validStaff = await window.AZAAD_RESTORE_STAFF_PROFILE();', 1)
if text.count('window.AZAAD_RESTORE_STAFF_PROFILE = async function restoreStaffProfile() {') != 1:
    raise SystemExit('Global Appwrite restore owner was not established exactly once')
if 'await restoreStaffProfile()' in text:
    raise SystemExit('Legacy unqualified restoreStaffProfile startup call remains')

STAFF_API = r'''async function staffApi(
  action,
  payload = {}
){
  const response = await fetch('/api/staff-admin', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, ...(payload || {}) })
  });
  let body = {};
  try { body = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
  return body;
}'''

def function_bounds(src, name):
    marker = re.search(rf'async function {re.escape(name)}\s*\(', src)
    if not marker:
        return None
    open_brace = src.find('{', marker.end())
    if open_brace < 0:
        return None
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = open_brace
    while i < len(src):
        c = src[i]
        n = src[i + 1] if i + 1 < len(src) else ''
        if line_comment:
            if c == '\n': line_comment = False
            i += 1
            continue
        if block_comment:
            if c == '*' and n == '/': block_comment = False; i += 2; continue
            i += 1
            continue
        if quote:
            if escape: escape = False
            elif c == '\\': escape = True
            elif c == quote: quote = None
            i += 1
            continue
        if c == '/' and n == '/': line_comment = True; i += 2; continue
        if c == '/' and n == '*': block_comment = True; i += 2; continue
        if c in "'\"`": quote = c; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return marker.start(), i + 1
        i += 1
    return None

bounds = function_bounds(text, 'staffApi')
if not bounds:
    raise SystemExit('Canonical staffApi() boundary not found')
text = text[:bounds[0]] + STAFF_API + text[bounds[1]:]

if 'functions/v1/staff-admin' in text:
    raise SystemExit('Legacy Supabase staff-admin endpoint remains')
if 'supabase.auth.' in text:
    raise SystemExit('Legacy Supabase auth runtime remains after Appwrite normalization')
if 'SUPABASE_PUBLISHABLE_KEY' in text:
    raise SystemExit('Legacy Supabase publishable key reference remains in executable Admin runtime')

path.write_text(text, encoding='utf-8')
print('retire-legacy-admin-staff-runtime.py completed: Appwrite restore binding + Neon staff API boundary enforced')
