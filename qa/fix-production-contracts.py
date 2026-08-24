from pathlib import Path
import re

CANONICAL_ADMIN_STORAGE_KEY = "azaad-clinic-admin-auth"


def patch_admin_auth():
    path = Path("admin.js")
    text = path.read_text(encoding="utf-8")

    # The preceding auth lifecycle transforms may already have normalized the
    # client. This transform must therefore be idempotent and accept either
    # detectSessionInUrl value plus an already-present storage/storageKey block.
    key_pattern = re.compile(r'const SUPABASE_AUTH_STORAGE_KEY\s*=\s*["\'][^"\']+["\'];?')
    key_matches = list(key_pattern.finditer(text))
    if key_matches:
        first = key_matches[0]
        text = text[:first.start()] + f'const SUPABASE_AUTH_STORAGE_KEY = "{CANONICAL_ADMIN_STORAGE_KEY}";' + text[first.end():]
        for match in reversed(list(key_pattern.finditer(text))[1:]):
            text = text[:match.start()] + text[match.end():]
    else:
        match = re.search(r'const SUPABASE_PUBLISHABLE_KEY\s*=\s*"[^"]+";', text)
        if not match:
            raise SystemExit("admin.js: SUPABASE_PUBLISHABLE_KEY declaration not found")
        insert = match.group(0) + f'\n\nconst SUPABASE_AUTH_STORAGE_KEY = "{CANONICAL_ADMIN_STORAGE_KEY}";'
        text = text[:match.start()] + insert + text[match.end():]

    auth_pattern = re.compile(
        r'auth:\s*\{\s*'
        r'persistSession:\s*true,\s*'
        r'autoRefreshToken:\s*true,\s*'
        r'detectSessionInUrl:\s*(?:true|false)\s*,?\s*'
        r'(?:storage:\s*window\.localStorage\s*,?\s*)?'
        r'(?:storageKey:\s*SUPABASE_AUTH_STORAGE_KEY\s*,?\s*)?'
        r'\}',
        re.S,
    )
    replacement = (
        'auth: {\n'
        '      persistSession: true,\n'
        '      autoRefreshToken: true,\n'
        '      detectSessionInUrl: false,\n'
        '      storage: window.localStorage,\n'
        '      storageKey: SUPABASE_AUTH_STORAGE_KEY\n'
        '    }'
    )
    matches = list(auth_pattern.finditer(text))
    if len(matches) != 1:
        raise SystemExit(f"admin.js: expected exactly one Supabase auth configuration, found {len(matches)}")
    text = text[:matches[0].start()] + replacement + text[matches[0].end():]

    path.write_text(text, encoding="utf-8")


patch_admin_auth()
print("Production auth contract unified.")
