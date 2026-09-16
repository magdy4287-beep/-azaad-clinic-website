from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
M=ROOT/'migrations/20260916_pharmacy_domain.sql'; A=ROOT/'api/pharmacy.js'; D=ROOT/'docs/PHARMACY_DOMAIN_DESIGN.md'
assert M.exists() and A.exists() and D.exists()
ms=M.read_text(); js=A.read_text(); doc=D.read_text()
for t in ['clinic_pharmacy_locations','clinic_medications','clinic_pharmacy_stock_lots','clinic_medication_orders','clinic_medication_order_items','clinic_pharmacy_dispenses','clinic_pharmacy_inventory_events','clinic_medication_reconciliation','clinic_pharmacy_events']: assert t in ms, t
for t in ['INTERNAL','EXTERNAL','create_order','dispense','receive_stock','reconcile','APPWRITE_ENDPOINT','DATABASE_URL','azaad_admin_appwrite_session','appwrite-neon']: assert t in js, t
assert 'supabase' not in js.lower(); assert 'Supabase is retired' in doc
for r in ['OWNER','ADMIN','MANAGER','DOCTOR','NURSE']: assert r in js
print('PHARMACY_DOMAIN_CONTRACT: PASS')
