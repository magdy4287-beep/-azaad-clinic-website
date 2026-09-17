from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sql=(ROOT/'migrations/20260916_facility_operating_modes.sql').read_text()
api=(ROOT/'api/facility-mode.js').read_text()
doc=(ROOT/'docs/FACILITY_OPERATING_MODES.md').read_text()
for marker in ['CLINIC_ONLY','HOSPITAL_ONLY','facility_module_registry','facility_mode_audit','pharmacy_internal','pharmacy_external','icu','emergency']:
    if marker not in sql+api+doc: raise SystemExit(f'FAIL missing {marker}')
for marker in ['APPWRITE_ENDPOINT','DATABASE_URL','azaad_admin_appwrite_session','OWNER_ROLES','module_not_certified','module_dependencies_not_satisfied']:
    if marker not in api: raise SystemExit(f'FAIL security marker {marker}')
if 'Supabase' not in doc: raise SystemExit('FAIL legacy architecture statement missing')
print('PASS: facility mode contract')
