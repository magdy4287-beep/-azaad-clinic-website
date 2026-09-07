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
    start = src.rfind('\n', 0, target) + 1
    while start < target and src[start].isspace() and src[start] != '\n':
        start += 1
    if src[start:start + 2] != 'if':
        line_start = src.rfind('\n', 0, target) + 1
        start = line_start
        while start < target and src[start].isspace() and src[start] != '\n':
            start += 1
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
                if end < len(src) and src[end] == '\n': end += 1
                return src[:start] + '\n' + src[end:], True
        i += 1
    raise SystemExit(f'FAIL-CLOSED: unterminated caller block for {needle}')


removed_init = False
removed_load = False

if 'window.AZAAD_STAFF' in text:
    text, removed_init = remove_if_block(text, 'window.AZAAD_STAFF.init')
    if 'window.AZAAD_STAFF' in text:
        text, removed_load = remove_if_block(text, 'window.AZAAD_STAFF.load')

executable = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
if re.search(r'window\.AZAAD_STAFF\s*&&\s*typeof\s+window\.AZAAD_STAFF\.(?:init|load)', executable):
    raise SystemExit('FAIL-CLOSED: legacy AZAAD_STAFF init/load caller remains in admin.js')
if re.search(r'window\.AZAAD_STAFF\.(?:init|load)\s*\(', executable):
    raise SystemExit('FAIL-CLOSED: direct legacy AZAAD_STAFF init/load call remains')

PATH.write_text(text, encoding='utf-8')
print(f'[AZAAD staff caller boundary] PASS: removed init={int(removed_init)}, load={int(removed_load)}; staff runtime is panel-activation only')
