from pathlib import Path
import re

PATH = Path('admin.js')
if not PATH.is_file():
    raise SystemExit('admin.js is required')

text = PATH.read_text(encoding='utf-8')


def remove_if_block(src, needle):
    target = src.find(needle)
    if target < 0:
        return src, False
    line_start = src.rfind('\n', 0, target) + 1
    start = line_start
    while start < target and src[start] in ' \t':
        start += 1
    if src[start:start + 2] != 'if':
        return src, False
    brace = src.find('{', target)
    if brace < 0:
        raise SystemExit(f'FAIL-CLOSED: caller block brace missing for {needle}')
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(src):
        c = src[i]
        n = src[i + 1] if i + 1 < len(src) else ''
        if line_comment:
            if c == '\n': line_comment = False
        elif block_comment:
            if c == '*' and n == '/': block_comment = False; i += 1
        elif quote:
            if escape: escape = False
            elif c == '\\': escape = True
            elif c == quote: quote = None
        elif c in "'\"`": quote = c
        elif c == '/' and n == '/': line_comment = True; i += 1
        elif c == '/' and n == '*': block_comment = True; i += 1
        elif c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(src) and src[end] == '\n': end += 1
                return src[:start] + '\n' + src[end:], True
        i += 1
    raise SystemExit(f'FAIL-CLOSED: unterminated caller block for {needle}')

removed_init = 0
removed_load = 0

while 'window.AZAAD_STAFF.init' in text:
    text, changed = remove_if_block(text, 'window.AZAAD_STAFF.init')
    if not changed:
        raise SystemExit('FAIL-CLOSED: legacy staff init caller is not inside an owned conditional block')
    removed_init += 1

while 'window.AZAAD_STAFF.load' in text:
    text, changed = remove_if_block(text, 'window.AZAAD_STAFF.load')
    if changed:
        removed_load += 1
        continue
    # A direct load call can exist inside an already role-gated quick action.
    # Remove only the call statement; panel activation remains the lazy-loader trigger.
    line_start = text.rfind('\n', 0, text.find('window.AZAAD_STAFF.load')) + 1
    line_end = text.find('\n', text.find('window.AZAAD_STAFF.load'))
    if line_end < 0:
        line_end = len(text)
    text = text[:line_start] + text[line_end + 1:]
    removed_load += 1

executable = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
executable = re.sub(r'(^|\s)//[^\n]*', r'\1', executable)
if re.search(r'window\.AZAAD_STAFF\.(?:init|load)\s*\(', executable):
    raise SystemExit('FAIL-CLOSED: direct legacy AZAAD_STAFF init/load call remains in admin.js')

PATH.write_text(text, encoding='utf-8')
print(f'[AZAAD staff caller boundary] PASS: removed init={removed_init}, load={removed_load}; staff runtime is panel-activation only')
