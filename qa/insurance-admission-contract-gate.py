#!/usr/bin/env python3
"""Fail-closed structural gate for the Insurance + Admission vertical slice."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

api = read('api/insurance-admission.js')
ui = read('insurance-admission-office.js')
patch = read('.github/patch-admin.py')
migration = read('db/migrations/20260916_insurance_admission_hybrid.sql')
doc = read('docs/AZAAD_INSURANCE_ADMISSION_GLOBAL_ARCHITECTURE_2026-09-16.md')

checks = {
    'canonical API boundary': 'api/insurance-admission.js' in api and "provider:'appwrite-neon'" in api,
    'Appwrite session auth': 'azaad_admin_appwrite_session' in api and '/account' in api,
    'Neon server boundary': '@neondatabase/serverless' in api,
    'coverage storage': 'clinic_patient_coverages' in api and 'save_coverage' in api,
    'payer registry': 'clinic_insurance_payers' in api,
    'authorization lifecycle': 'create_authorization' in api and 'submit_authorization' in api and 'record_payer_response' in api,
    'AI human gate': 'ai_review' in api and 'human_decision' in api and 'human_review_required' in api,
    'admission episode': 'create_admission' in api and 'clinic_admission_episodes' in api,
    'bed assignment': 'assign_bed' in api and 'clinic_admission_bed_assignments' in api,
    'discharge gate': 'discharge_checklist_incomplete' in api and 'insurance_clearance' in api and 'financial_clearance' in api,
    'RCM linkage': 'clinic_invoices' in migration and 'final_invoice_id' in migration,
    'hybrid payer modes': 'manual_portal' in migration and 'fhir_pas' in migration and 'x12_278' in migration and 'national_gateway' in migration,
    'admin single owner': patch.count('insurance-admission-office.js') == 1,
    'browser uses same-origin API': '/api/insurance-admission' in ui and 'createClient' not in ui and 'supabase' not in ui.lower(),
    'global architecture documented': 'FHIR PAS' in doc and 'NPHIES' in doc and 'Riayati' in doc and 'eClaimLink' in doc,
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Insurance/Admission contract gate failed: ' + ', '.join(failed))
print(f'Insurance/Admission contract gate passed: {len(checks)}/{len(checks)}')
