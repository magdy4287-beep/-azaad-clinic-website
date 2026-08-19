from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / 'admin.js').read_text(encoding='utf-8')
patcher = (ROOT / '.github' / 'patch-admin.py').read_text(encoding='utf-8')
workflow = (ROOT / 'secretary-hybrid-workflow.js').read_text(encoding='utf-8')
demo = (ROOT / 'patient-demographics-editor.js').read_text(encoding='utf-8')
invoice = (ROOT / 'invoice-print-email.js').read_text(encoding='utf-8')
scheduling = (ROOT / 'scheduling-actions-contract.js').read_text(encoding='utf-8')

# admin.js is intentionally patched at build time; the production deploy and PR browser build run patch-admin.py.
assert 'SECRETARY:' in admin
secretary_patch = patcher.split('SECRETARY:', 1)[1]
assert 'finance.view' in secretary_patch.split('RECEPTION:', 1)[0] or 'finance.view' in secretary_patch.split('CASHIER:', 1)[0]
for needle in ('secretary-hybrid-workflow.js','patient-demographics-editor.js','invoice-print-email.js'):
    assert needle in patcher, needle
for needle in ('clinic_update_patient_demographics','p_marital_status','p_residence','p_height_cm','p_weight_kg','PATIENT_NAME'):
    assert needle in workflow or needle in demo, needle
for needle in ('requestRefund','AZAAD_REFUNDS','invoice','print','mailto:'):
    assert needle in workflow or needle in invoice, needle
for needle in ('SECRETARY','RESCHEDULE','ASSIGN_WAITING','CANCEL'):
    assert needle in scheduling, needle
assert 'service_role' not in workflow and 'service_role' not in demo and 'service_role' not in invoice
print('Secretary hybrid role contract gate: PASS')
