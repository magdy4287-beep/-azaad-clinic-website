from pathlib import Path
import re


def inject(path_name, tag, pattern):
    p = Path(path_name)
    text = p.read_text(encoding='utf-8')
    text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    text = text.replace('</body>', tag + '\n</body>', 1)
    p.write_text(text, encoding='utf-8')


inject(
    'admin.html',
    '<script src="admin-media-editor.js?v=2026.08.23.1" defer></script>',
    r'<script\b[^>]*\bsrc=["\']admin-media-editor\.js(?:\?[^"\']*)?["\'][^>]*></script>\s*',
)
inject(
    'index.html',
    '<script src="public-media-transforms.js?v=2026.08.23.1" defer></script>',
    r'<script\b[^>]*\bsrc=["\']public-media-transforms\.js(?:\?[^"\']*)?["\'][^>]*></script>\s*',
)
print('Media editor injection complete; canonical media owners enforced')