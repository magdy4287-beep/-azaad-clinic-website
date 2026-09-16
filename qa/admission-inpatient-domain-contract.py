from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = {
    'migration': ROOT / 'migrations/20260916_admission_inpatient_domain.sql',
    'api': ROOT / 'api/admissions.js',
    'domain_map': ROOT / 'docs/AZAAD_HOSPITAL_MASTER_DOMAIN_MAP.md',
}
for name, path in checks.items():
    if not path.exists():
        raise SystemExit(f'FAIL: missing {name}: {path}')

migration = checks['migration'].read_text(encoding='utf-8')
api = checks['api'].read_text(encoding='utf-8')
map_text = checks['domain_map'].read_text(encoding='utf-8')

required_tables = [
    'clinic_wards', 'clinic_beds', 'clinic_admissions',
    'clinic_bed_assignments', 'clinic_inpatient_transfers', 'clinic_inpatient_events'
]
required_actions = ['create_ward', 'create_bed', 'admit', 'assign_bed', 'transfer', 'discharge']
for table in required_tables:
    if f'public.{table}' not in migration:
        raise SystemExit(f'FAIL: missing table {table}')
for action in required_actions:
    if f"action===''{action}''".replace("''", "'") not in api:
        raise SystemExit(f'FAIL: missing action {action}')
for marker in ['Appwrite', 'neon', "COOKIE = 'azaad_admin_appwrite_session'", 'WRITE_ROLES']:
    if marker not in api:
        raise SystemExit(f'FAIL: missing security marker {marker}')
if 'Supabase is retired' not in map_text:
    raise SystemExit('FAIL: canonical domain map does not declare Supabase retired')
print('PASS: admission/inpatient/ward contract')
