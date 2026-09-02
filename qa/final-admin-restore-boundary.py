from pathlib import Path
import re

PATH = Path('admin.js')
if not PATH.is_file():
    raise SystemExit('admin.js missing')

js = PATH.read_text(encoding='utf-8')

RESTORE = '''async function restoreStaffProfile() {
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

def find_top_level_function(source, name):
    # Function declarations may be synchronous or async; both are valid here.
    pattern = re.compile(rf'(?:async\s+)?function\s+{re.escape(name)}\s*\(')
    for match in pattern.finditer(source):
        depth = 0
        quote = None
        escape = False
        line_comment = False
        block_comment = False
        i = 0
        while i < match.start():
            ch = source[i]
            nxt = source[i + 1] if i + 1 < len(source) else ''
            if line_comment:
                if ch == '\n': line_comment = False
                i += 1; continue
            if block_comment:
                if ch == '*' and nxt == '/': block_comment = False; i += 2; continue
                i += 1; continue
            if quote:
                if escape: escape = False
                elif ch == '\\': escape = True
                elif ch == quote: quote = None
                i += 1; continue
            if ch == '/' and nxt == '/': line_comment = True; i += 2; continue
            if ch == '/' and nxt == '*': block_comment = True; i += 2; continue
            if ch in "'\"`": quote = ch; i += 1; continue
            if ch == '{': depth += 1
            elif ch == '}': depth = max(0, depth - 1)
            i += 1
        if depth == 0:
            return match.start()
    return None

def function_end(source, start):
    brace = source.find('{', start)
    if brace < 0: raise SystemExit('function opening brace missing')
    depth = 0; quote = None; escape = False; line_comment = False; block_comment = False; i = brace
    while i < len(source):
        ch = source[i]; nxt = source[i + 1] if i + 1 < len(source) else ''
        if line_comment:
            if ch == '\n': line_comment = False
            i += 1; continue
        if block_comment:
            if ch == '*' and nxt == '/': block_comment = False; i += 2; continue
            i += 1; continue
        if quote:
            if escape: escape = False
            elif ch == '\\': escape = True
            elif ch == quote: quote = None
            i += 1; continue
        if ch == '/' and nxt == '/': line_comment = True; i += 2; continue
        if ch == '/' and nxt == '*': block_comment = True; i += 2; continue
        if ch in "'\"`": quote = ch; i += 1; continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: return i + 1
        i += 1
    raise SystemExit('function closing brace missing')

# Remove every executable restoreStaffProfile declaration, including a wrongly nested one.
while True:
    match = re.search(r'async function restoreStaffProfile\s*\(', js)
    if not match: break
    js = js[:match.start()] + js[function_end(js, match.start()):]

# Insert exactly once after the top-level applyStaffRole function so the symbol is globally visible.
apply_start = find_top_level_function(js, 'applyStaffRole')
if apply_start is None:
    raise SystemExit('top-level applyStaffRole not found')
apply_end = function_end(js, apply_start)
js = js[:apply_end] + '\n\n' + RESTORE + js[apply_end:]

if len(re.findall(r'async function restoreStaffProfile\s*\(', js)) != 1:
    raise SystemExit('restoreStaffProfile declaration count is not exactly one')
if find_top_level_function(js, 'restoreStaffProfile') is None:
    raise SystemExit('restoreStaffProfile is not top-level after repair')

PATH.write_text(js, encoding='utf-8')
print('[AZAAD final restore boundary] PASS: exactly one top-level Appwrite restoreStaffProfile owner')
