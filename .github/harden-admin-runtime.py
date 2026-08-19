from pathlib import Path
import re

UMD = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.56.1/dist/umd/supabase.min.js'
ADMIN_MARKER = './admin.js?v=2026-08-19-auth'
IMPORT_RE = re.compile(r'import\s*\{\s*createClient\s*\}\s*from\s*["\']https://[^"\']+/supabase-js@2[^"\']*["\']\s*;?', re.S)

admin = Path('admin.js')
if admin.exists():
    text = admin.read_text(encoding='utf-8')
    text, count = IMPORT_RE.subn('const { createClient } = window.supabase;', text, count=1)
    if count != 1:
        if re.search(r'import\s*\{\s*createClient\s*\}', text):
            raise RuntimeError('canonical admin.js still contains an unsupported Supabase ESM import shape')
        raise RuntimeError('canonical admin.js Supabase ESM import was not found')
    if re.search(r'import\s*\{\s*createClient\s*\}', text):
        raise RuntimeError('canonical admin.js still contains a Supabase ESM import after hardening')
    admin.write_text(text, encoding='utf-8')

html = Path('admin.html')
if html.exists():
    text = html.read_text(encoding='utf-8')
    text = re.sub(r'<script\s+[^>]*src=["\']https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@2[^"\']*["\'][^>]*></script>\s*', '', text, count=1, flags=re.I)
    text = re.sub(r'<script\s+type=["\']module["\']\s+src=["\']\./admin\.js\?v=2026-08-19-auth["\']\s*></script>\s*', '', text, count=1, flags=re.I)
    classic_marker = f'<script src="{ADMIN_MARKER}" defer></script>'
    if UMD not in text:
        text = text.replace('</head>', f'<script src="{UMD}"></script>\n</head>', 1)
    if classic_marker not in text:
        if '</body>' not in text:
            raise RuntimeError('admin.html has no closing body tag for canonical admin controller injection')
        text = text.replace('</body>', classic_marker + '\n</body>', 1)
    html.write_text(text, encoding='utf-8')

print('Admin runtime hardened: pinned Supabase UMD loads synchronously before classic canonical admin.js; no Supabase ESM import remains.')
