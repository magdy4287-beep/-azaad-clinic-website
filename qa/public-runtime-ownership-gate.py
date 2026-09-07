from pathlib import Path

INDEX = Path('index.html')
COORDINATOR = Path('public-clinic-data-coordinator.js')
EXPERIENCE = Path('public-experience-hardening.js')
RETIRED_CACHE = Path('public-clinic-data-request-cache.js')
LEGACY_MARKER = 'derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-clinic-data'

if not INDEX.is_file():
    raise SystemExit('Public runtime ownership: index.html missing')
if not COORDINATOR.is_file():
    raise SystemExit('Public runtime ownership: canonical coordinator missing')
if not EXPERIENCE.is_file():
    raise SystemExit('Public runtime ownership: experience hardening missing')

index = INDEX.read_text(encoding='utf-8')
coordinator = COORDINATOR.read_text(encoding='utf-8')
experience = EXPERIENCE.read_text(encoding='utf-8')

if index.count('public-clinic-data-coordinator.js') != 1:
    raise SystemExit('Public runtime ownership: coordinator must be loaded exactly once')
if 'public-clinic-data-request-cache.js' in index:
    raise SystemExit('Public runtime ownership: retired duplicate request cache is still injected')
if RETIRED_CACHE.exists():
    raise SystemExit('Public runtime ownership: retired duplicate request cache file still exists')
if "const API = '/api/public-clinic-data';" not in coordinator:
    raise SystemExit('Public runtime ownership: coordinator canonical API owner missing')
if LEGACY_MARKER in coordinator:
    raise SystemExit('Public runtime ownership: coordinator still contains retired Supabase endpoint')
if LEGACY_MARKER in experience:
    raise SystemExit('Public runtime ownership: experience hardening still contains retired Supabase endpoint')
if "const CLINIC_API = '/api/public-clinic-data';" not in experience:
    raise SystemExit('Public runtime ownership: experience hardening canonical API missing')

print('[AZAAD public-runtime-ownership] PASS: one coordinator, no duplicate cache, no retired public Supabase endpoint', flush=True)
