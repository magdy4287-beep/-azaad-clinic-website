from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
M=ROOT/'migrations/20260916_pharmacy_domain.sql'; A=ROOT/'api/pharmacy.js'; D=ROOT/'docs/PHARMACY_DOMAIN_DESIGN.md'
assert M.exists() and A.exists() and D.exists()
ms=M.read_text(); js=A.read_text(); doc=D.read_text()
for t in [
'clinic_medications','clinic_internal_pharmacy_locations','clinic_external_pharmacy_locations',
'clinic_internal_pharmacy_stock_lots','clinic_external_pharmacy_stock_lots',
'clinic_internal_pharmacy_orders','clinic_internal_pharmacy_order_items','clinic_internal_pharmacy_dispenses',
'clinic_external_pharmacy_prescriptions','clinic_external_pharmacy_prescription_items','clinic_external_pharmacy_dispenses',
'clinic_internal_pharmacy_inventory_events','clinic_external_pharmacy_inventory_events',
'clinic_internal_pharmacy_events','clinic_external_pharmacy_events','clinic_pharmacy_reconciliation']:
    assert t in ms, t
for t in ['channel','INTERNAL','EXTERNAL','SHARED','create_order','create_prescription','dispense','receive_stock','reconcile','APPWRITE_ENDPOINT','DATABASE_URL','azaad_admin_appwrite_session','appwrite-neon']:
    assert t in js, t
assert 'clinic_pharmacy_locations' not in js
assert 'clinic_medication_orders' not in js
assert 'clinic_pharmacy_stock_lots' not in js
assert 'supabase' not in js.lower()
assert 'Supabase is retired' in doc
for r in ['OWNER','ADMIN','MANAGER','DOCTOR','NURSE']: assert r in js
assert 'Internal inventory cannot be mutated by external' in doc
assert 'External inventory cannot be mutated by internal' in doc
print('PHARMACY_DOMAIN_CONTRACT: PASS')
