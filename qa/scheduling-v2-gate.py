from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / 'admin.html').read_text(encoding='utf-8')
ui = (ROOT / 'scheduling-v2.js').read_text(encoding='utf-8')
api = (ROOT / 'api' / 'admin-appointments.js').read_text(encoding='utf-8')
transform = (ROOT / 'qa' / 'finalize-scheduling-v2-appwrite.py').read_text(encoding='utf-8')
api_transform = (ROOT / 'qa' / 'finalize-scheduling-api-boundary.py').read_text(encoding='utf-8')

required_ui = [
    'const API=\'/api/admin-appointments?resource=scheduling\';',
    "fetch(u.toString(),{method,credentials:'include',cache:'no-store'",
    "BOOK", "RESCHEDULE", "TRANSFER", "CANCEL", "NO_SHOW", "ASSIGN_WAITING", "ADD_WAITING",
]
for item in required_ui:
    if item not in ui:
        raise SystemExit(f'Scheduling V2 missing canonical marker: {item}')

for forbidden in ('window.AZAAD?.supabase', 'functions.invoke(\'azaad-appointments-actions\'', 'supabase-js', 'Supabase client'):
    if forbidden in ui:
        raise SystemExit(f'Scheduling V2 legacy runtime survived: {forbidden}')

if "resource==='scheduling'" not in api:
    raise SystemExit('Scheduling API boundary missing from consolidated admin-appointments owner')
for action in ('BOOK','RESCHEDULE','TRANSFER','CANCEL','NO_SHOW','ADD_WAITING','ASSIGN_WAITING'):
    if action not in api:
        raise SystemExit(f'Scheduling API action missing: {action}')
if "provider:'appwrite-neon'" not in api:
    raise SystemExit('Scheduling API must declare Appwrite-Neon provider')

for source,name in ((transform,'browser transform'),(api_transform,'API transform')):
    if 'Supabase client' in source or 'functions.invoke(\'azaad-appointments-actions\'' in source:
        raise SystemExit(f'{name} contains retired Supabase runtime logic')

if 'scheduling-v2-waiting.js' in admin:
    raise SystemExit('Obsolete duplicate waiting-list runtime must not be wired into Admin')

for forbidden in (".from('clinic_bookings')", ".from('clinic_waiting_list')", "window.AZAAD?.supabase"):
    if forbidden in ui:
        raise SystemExit(f'Scheduling V2 must not retain direct/legacy runtime marker: {forbidden}')

print('Scheduling V2 gate: PASS — Appwrite session → consolidated admin-appointments → Neon; single runtime owner')
