from pathlib import Path
import re

UMD = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.56.1/dist/umd/supabase.min.js'

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
    marker = '<script type="module" src="./admin.js?v=2026-08-19-auth"></script>'
    if marker not in text:
        raise RuntimeError('canonical admin.js injection marker is missing')
    if UMD not in text:
        text = text.replace(marker, f'<script src="{UMD}" defer></script>\n{marker}', 1)
    html.write_text(text, encoding='utf-8')

print('Admin runtime hardened: pinned Supabase UMD loads before canonical admin.js; no remote Supabase ESM import remains in admin.js.')
