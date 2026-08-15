#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[1]
rcm=(root/'rcm-finance-center.js').read_text(encoding='utf-8')
loader=(root/'rcm-finance-loader.js').read_text(encoding='utf-8')
checks=['clinic_invoices','clinic_payments','invoice_number','verification_status','azaadRcmSearch','azaadRcmDate']
missing=[x for x in checks if x not in rcm]
if missing: raise SystemExit('Missing RCM UI contract: '+', '.join(missing))
if 'rcm-finance-center.js' not in loader: raise SystemExit('Loader does not reference RCM Finance Center')
print('PASS: RCM Finance UI + loader contract')
