from pathlib import Path
import re

path = Path('admin.js')
if not path.is_file():
    raise SystemExit('admin.js is required')
text = path.read_text(encoding='utf-8')

# The Appwrite restore transform owns the implementation. Expose that exact
# owner through window so startup cannot lose the binding through a legacy
# function scope introduced by earlier transforms.
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
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
  }
  return body;
}'''

pattern = re.compile(r'async function staffApi\(\s*action,\s*payload = \{\}\s*\)\{.*?\n\}\s*\n\s*let data =', re.S)
match = pattern.search(text)
if not match:
    raise SystemExit('Canonical staffApi() boundary not found')
replacement = STAFF_API + '\n\nlet data ='
text = text[:match.start()] + replacement + text[match.end():]

if 'functions/v1/staff-admin' in text:
    raise SystemExit('Legacy Supabase staff-admin endpoint remains')
if 'supabase.auth.' in text:
    raise SystemExit('Legacy Supabase auth runtime remains after Appwrite normalization')
if 'SUPABASE_PUBLISHABLE_KEY' in text:
    raise SystemExit('Legacy Supabase publishable key reference remains in executable Admin runtime')

path.write_text(text, encoding='utf-8')
print('retire-legacy-admin-staff-runtime.py completed: Appwrite restore binding + Neon staff API boundary enforced')
