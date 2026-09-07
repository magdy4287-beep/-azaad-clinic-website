from pathlib import Path

CANONICAL = '''async function staffApi(action, payload = {}) {
  const allowed = ['list', 'create', 'update_role', 'enable', 'disable', 'reset_password'];
  if (!allowed.includes(String(action || ''))) throw new Error('invalid_staff_action');
  const response = await fetch('/api/staff-admin', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...(payload || {}) })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
  return body;
}'''

def replace_function(text, name):
    marker = f'async function {name}('
    start = text.find(marker)
    if start < 0:
        return text, False
    brace = text.find('{', start)
    if brace < 0:
        raise RuntimeError(f'{name}: function opening brace not found')
    depth = 0
    quote = None
    escape = False
    line_comment = block_comment = False
    i = brace
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if c == '\n': line_comment = False
        elif block_comment:
            if c == '*' and n == '/': block_comment = False; i += 1
        elif quote:
            if escape: escape = False
            elif c == '\\': escape = True
            elif c == quote: quote = None
        elif c in ('"', "'", '`'):
            quote = c
        elif c == '/' and n == '/': line_comment = True; i += 1
        elif c == '/' and n == '*': block_comment = True; i += 1
        elif c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                return text[:start] + CANONICAL + text[end:], True
        i += 1
    raise RuntimeError(f'{name}: unterminated function body')

def main():
    path = Path('admin.html')
    if not path.exists():
        raise SystemExit(0)
    text = path.read_text(encoding='utf-8')
    text, changed = replace_function(text, 'staffApi')
    if changed:
        path.write_text(text, encoding='utf-8')
        print('inline staffApi canonicalized to Appwrite HttpOnly + /api/staff-admin')
    else:
        print('inline staffApi already absent')

if __name__ == '__main__':
    main()
