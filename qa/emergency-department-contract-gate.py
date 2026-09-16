#!/usr/bin/env python3
"""Structural contract gate for the canonical Emergency Department workflow."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

api = read('api/emergency-department.js')
ui = read('emergency-department.js')
patch = read('.github/patch-admin.py')
migration = read('db/migrations/20260916_emergency_department_hybrid.sql')

checks = {
    'ED API source is non-empty': bool(api.strip()),
    'canonical Appwrite session': "azaad_admin_appwrite_session" in api and '/account' in api,
    'canonical Neon boundary': "@neondatabase/serverless" in api and "DATABASE_URL" in api,
    'reception registration': 'register_or_find_patient' in api,
    'ED encounter': 'create_encounter' in api and 'clinic_ed_encounters' in migration,
    'triage levels 1-5': 'TRIAGE_LEVELS=new Set([1,2,3,4,5])' in api,
    'triage audit': 'clinic_ed_triage_assessments' in api and 'triage_recorded' in api,
    'doctor assignment': "role='DOCTOR'" in api and 'assign_team' in api,
    'nursing assignment field': 'assigned_nurse_id' in api,
    'clinical notes': 'clinical_note' in api and 'clinic_ed_clinical_notes' in migration,
    'care orders': 'care_order_created' in api and 'clinic_ed_care_orders' in migration,
    'disposition': 'disposition' in api and all(x in api for x in ('discharge','admit','icu','surgery','observation','transfer')),
    'admission linkage': 'clinic_admission_episodes' in api,
    'AI human gate': 'human_review_required' in api and 'does not assign acuity' in ui,
    'payment never blocks clinical care': 'Financial routing never blocks clinically indicated emergency care.' in api and 'clinical_first' in api,
    'billing boundary': 'clinic_ed_billing_events' in migration and "resource==='billing'" in api,
    'audit event ledger': 'clinic_ed_events' in migration and 'await audit' in api,
    'Admin runtime owner': 'emergency-department.js' in patch,
    'no Supabase runtime': 'supabase' not in api.lower() and 'supabase' not in ui.lower(),
    'no browser database SDK': 'createClient' not in ui and 'from(' not in ui,
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Emergency Department contract gate failed: ' + ', '.join(failed))
print(f'Emergency Department contract gate passed: {len(checks)}/{len(checks)}')
