from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    p = ROOT / name
    assert p.exists() and p.stat().st_size > 0, f"missing: {name}"
    return p.read_text(encoding="utf-8")

patcher = read(".github/patch-admin.py")
finance = read("patient-financial-summary.js")
patient_center = read("patients-center.js")

assert 'patient-financial-summary.js' in patcher
assert 'clinic_invoices' in finance
assert 'clinic_payments' in finance
assert 'patient_id' in finance
assert 'invoice_number' in finance
assert 'Outstanding' in finance or 'المتبقي' in finance
assert 'Collected' in finance or 'المدفوع' in finance
assert 'Patient 360' in patient_center or 'Patient 360' in finance

# Financial data is read-only in this overlay; no invoice/payment mutation endpoints are present.
for forbidden in ('clinic_record_payment', 'clinic_edit_invoice', 'DELETE', 'PATCH', 'POST'):
    assert forbidden not in finance, f"unexpected mutation capability: {forbidden}"

# Secrets must remain server-side.
assert 'service_role' not in finance.lower()

print('Azaad Patient 360 financial integration contract: PASS')
