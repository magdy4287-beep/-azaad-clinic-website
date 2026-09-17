from pathlib import Path
import re


def inject(path_name, tag, pattern):
    p = Path(path_name)
    text = p.read_text(encoding='utf-8')
    text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    text = text.replace('</body>', tag + '\n</body>', 1)
    if text.count(tag) != 1:
        raise SystemExit(f'FAIL-CLOSED: expected exactly one canonical public media owner in {path_name}')
    p.write_text(text, encoding='utf-8')


# The former Admin media editor depended on the retired database provider and
# had no canonical Appwrite/Neon backend owner. Retire that browser owner.
# Public media transforms remain a separate patient-facing presentation owner.
inject(
    'index.html',
    '<script src="public-media-transforms.js?v=2026.08.23.1" defer></script>',
    r'<script\b[^>]*\bsrc=["\']public-media-transforms\.js(?:\?[^"\']*)?["\'][^>]*></script>\s*',
)
print('Public media transform injection complete; retired Admin media editor excluded')
