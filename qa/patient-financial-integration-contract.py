from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    p = ROOT / name
    assert p.exists() and p.stat().st_size > 0, f"missing: {name}"
    return p.read_text(encoding="utf-8")


patcher = read(".github/patch-admin.py")
finance_ui = read("patient-financial-summary.js")
finance_api = read("api/patient-financial-summary.js")
patient_center = read("patients-center.js")

# Patient 360 must mount the financial UI through the canonical API boundary.
assert 'patient-financial-summary.js' in patcher
assert "'/api/patient-financial-summary'" in finance_ui
assert 'Patient Financial Snapshot' in finance_ui or 'الملخص المالي للمريض' in finance_ui
assert 'Outstanding' in finance_ui or 'المتبقي' in finance_ui
assert 'Collected' in finance_ui or 'المدفوع' in finance_ui
assert 'Patient 360' in patient_center or 'Patient 360' in finance_ui

# The server boundary is authoritative for financial data and uses Neon directly.
assert "import { neon } from '@neondatabase/serverless'" in finance_api
assert "request.method !== 'GET'" in finance_api
assert 'public.clinic_invoices' in finance_api
assert 'public.clinic_payments' in finance_api
assert 'patient_id' in finance_api
assert 'invoice_number' in finance_api
assert "credentials: 'include'" in finance_ui

# Authorization must be server-side and tied to the Appwrite session + active clinic staff role.
assert "azaad_admin_appwrite_session" in finance_api
assert 'X-Appwrite-Session' in finance_api
assert 'public.clinic_staff' in finance_api
assert 'active = true' in finance_api
assert 'ALLOWED_ROLES' in finance_api

# No client-side privileged credential or financial mutation capability.
assert 'service_role' not in finance_ui.lower()
assert 'APPWRITE_API_KEY' not in finance_ui
for forbidden in ('clinic_record_payment', 'clinic_edit_invoice', 'DELETE', 'PATCH', 'POST'):
    assert forbidden not in finance_ui, f"unexpected client mutation capability: {forbidden}"

print('Azaad Patient 360 financial integration contract: PASS')
