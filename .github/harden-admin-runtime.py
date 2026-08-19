from pathlib import Path
import re

UMD = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.56.1/dist/umd/supabase.min.js'
ADMIN_MARKER = './admin.js?v=2026-08-19-auth'

admin = Path('admin.js')
if admin.exists():
    text = admin.read_text(encoding='utf-8')
    text, count = re.subn(r'import\s*\{\s*createClient\s*\}\s*from\s*["\']https://[^"\']+/supabase-js@2(?:/\+esm)?["\'];', 'const { createClient } = window.supabase;', text, count=1)
    if count != 1:
        raise RuntimeError('canonical admin.js Supabase ESM import was not found')
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

print('Admin runtime hardened: synchronous pinned Supabase UMD loads before classic canonical admin.js; no remote Supabase ESM import remains in admin.js.')
