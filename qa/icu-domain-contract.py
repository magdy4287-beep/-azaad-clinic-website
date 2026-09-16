from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
migration = ROOT / 'migrations/20260916_icu_domain.sql'
api = ROOT / 'api/icu.js'
domain_map = ROOT / 'docs/AZAAD_HOSPITAL_MASTER_DOMAIN_MAP.md'
for name, path in [('migration', migration), ('api', api), ('domain_map', domain_map)]:
    if not path.exists():
        raise SystemExit(f'FAIL: missing {name}')
mt = migration.read_text(encoding='utf-8')
at = api.read_text(encoding='utf-8')
dm = domain_map.read_text(encoding='utf-8')
for table in ['clinic_icu_units','clinic_icu_beds','clinic_icu_stays','clinic_icu_observations','clinic_icu_flowsheet_entries','clinic_icu_escalations','clinic_icu_events']:
    if f'public.{table}' not in mt:
        raise SystemExit(f'FAIL: missing table {table}')
for action in ['create_unit','create_bed','start_stay','observation','flowsheet','escalate','resolve_escalation','discharge_stay']:
    if f"action==='{action}'" not in at:
        raise SystemExit(f'FAIL: missing action {action}')
for marker in ['APPWRITE_ENDPOINT','DATABASE_URL',"COOKIE = 'azaad_admin_appwrite_session'",'WRITE_ROLES','appwrite-neon']:
    if marker not in at:
        raise SystemExit(f'FAIL: missing security/runtime marker {marker}')
if 'Supabase is retired' not in dm:
    raise SystemExit('FAIL: Supabase retirement contract missing')
if 'NURSE' not in at:
    raise SystemExit('FAIL: NURSE role missing')
print('PASS: ICU domain contract')
