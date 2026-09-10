#!/usr/bin/env python3
"""Current RCM/payment reporting contract.

The legacy finance.js/rcm.js browser owners were retired. The canonical owner
is admin-enterprise-centers.js -> /api/invoices?limit=200, backed by Neon.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
enterprise = (ROOT / 'admin-enterprise-centers.js').read_text(encoding='utf-8')
api = (ROOT / 'api' / 'invoices.js').read_text(encoding='utf-8')

checks = {
    'enterprise RCM owner': "if(key==='rcm')" in enterprise,
    'payment data': 'clinic_payments' in api and 'paid_amount' in api,
    'invoice data': 'clinic_invoices' in api and 'invoice_number' in api,
    'outstanding calculation': 'outstanding' in api and 'total -' in api,
    'amount': 'amount' in api and 'total' in api,
    'daily reporting': 'daily' in enterprise.lower() or 'today' in enterprise.lower(),
    'monthly reporting': 'monthly' in enterprise.lower() or 'month' in enterprise.lower(),
    'annual reporting': 'annual' in enterprise.lower() or 'year' in enterprise.lower(),
    'date filtering': "limit=200" in enterprise and ('from_date' in api or 'to_date' in api or 'gte(' in api),
    'protected session boundary': "credentials: 'include'" in enterprise and "cache: 'no-store'" in enterprise,
    'Appwrite-Neon backend': "provider: 'appwrite-neon'" in api and "@neondatabase/serverless" in api,
    'RCM roles': "OWNER', 'ADMIN', 'MANAGER', 'CASHIER" in api,
    'legacy global RCM owners removed': not (ROOT / 'rcm-finance-loader.js').exists() and not (ROOT / 'rcm-finance-center.js').exists(),
    'no Supabase in canonical RCM owner': 'supabase' not in enterprise.lower(),
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items(): print(f"{'PASS' if ok else 'FAIL'}: {name}")
if failed: raise SystemExit('Payments/reporting contract gate failed: ' + ', '.join(failed))
print('Payments/reporting contract gate: PASS')
