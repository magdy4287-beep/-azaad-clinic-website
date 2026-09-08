from pathlib import Path

# Auth ownership moved to qa/finalize-appwrite-admin-auth.py.
# This transform remains in the build graph only as a compatibility checkpoint;
# it must never recreate Supabase browser storage/session state after Appwrite
# becomes the canonical production identity boundary.
path = Path('admin.js')
if not path.is_file():
    raise SystemExit('admin.js is required')
text = path.read_text(encoding='utf-8')

legacy_markers = (
    'const SUPABASE_AUTH_STORAGE_KEY',
    'sb-derofsthjivlkcdnojww-auth-token',
)
for marker in legacy_markers:
    if marker in text:
        # Do not repair/rewrite it here. The canonical Appwrite transform owns
        # removal and fail-closed verification later in the same build graph.
        print(f'[AZAAD production contract] deferred legacy marker to canonical Appwrite owner: {marker}')

print('Production auth contract checkpoint: PASS — no competing Supabase auth transform mutation')
