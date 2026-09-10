from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
UI = ROOT / 'admin-purchasing-center.js'
API = ROOT / 'api' / 'purchases.js'

if not UI.is_file() or not API.is_file():
    raise SystemExit('FAIL-CLOSED: purchasing runtime or API boundary is missing')

ui = UI.read_text(encoding='utf-8')
api = API.read_text(encoding='utf-8')

for label, text in (('admin-purchasing-center.js', ui), ('api/purchases.js', api)):
    executable = re.sub(r'/\*[\s\S]*?\*/', '', text)
    executable = re.sub(r'(^|\n)\s*//.*?(?=\n|$)', r'\1', executable)
    for marker in ('supabase.co', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', '@supabase/supabase-js', 'window.supabase', 'window.supabaseClient'):
        if marker.lower() in executable.lower():
            raise SystemExit(f'FAIL-CLOSED: retired Supabase runtime marker in {label}: {marker}')

if "const ENDPOINT = '/api/purchases'" not in ui:
    raise SystemExit('FAIL-CLOSED: Purchasing UI does not use the same-origin canonical API')
if "credentials: 'include'" not in ui:
    raise SystemExit('FAIL-CLOSED: Purchasing UI does not forward the server-managed session cookie')
if 'azaad:admin-panel-activated' not in ui:
    raise SystemExit('FAIL-CLOSED: Purchasing UI is not panel-activation driven')

if "const COOKIE = 'azaad_admin_appwrite_session'" not in api:
    raise SystemExit('FAIL-CLOSED: Purchasing API is not bound to the canonical Appwrite session cookie')
if "@neondatabase/serverless" not in api or 'clinic_purchases' not in api:
    raise SystemExit('FAIL-CLOSED: Purchasing API is not backed by Neon clinic_purchases')
if "const WRITE_ROLES = new Set(['OWNER','ADMIN','MANAGER'])" not in api:
    raise SystemExit('FAIL-CLOSED: Purchasing write-role boundary drifted')
if 'if (!WRITE_ROLES.has(identity.role))' not in api:
    raise SystemExit('FAIL-CLOSED: Purchasing API does not enforce write authorization')
if 'PURCHASE_CREATE' not in api or 'PURCHASE_UPDATE' not in api or 'PURCHASE_DELETE' not in api:
    raise SystemExit('FAIL-CLOSED: Purchasing mutations are not auditable')

print('[AZAAD purchasing runtime boundary gate] PASS: same-origin UI + Appwrite HttpOnly session + Neon API + management-only writes + audit')
