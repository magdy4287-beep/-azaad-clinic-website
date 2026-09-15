#!/usr/bin/env python3
"""Structural acceptance gate for the canonical Appwrite-Neon Waiting List."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

ui = read('waiting-list-center.js')
api = read('api/waiting-list.js')
patch = read('.github/patch-admin.py')

checks = {
    'canonical waiting list API exists': 'api/waiting-list.js' in patch or 'waiting-list-center.js' in patch,
    'browser has no provider SDK': 'window.AZAAD?.supabase' not in ui and 'createClient' not in ui,
    'same-origin API reads': '/api/waiting-list?resource=entries' in ui,
    'same-origin patient search': '/api/waiting-list?resource=patients' in ui,
    'same-origin doctor list': '/api/waiting-list?resource=doctors' in ui,
    'same-origin create': "'/api/waiting-list'" in ui,
    'same-origin status update': "method:'PATCH'" in ui and '/api/waiting-list' in ui,
    'patient identity': 'patient_id' in api,
    'doctor identity': 'doctor_id' in api,
    'MRN search': 'mrn' in api,
    'phone search': 'patient_phone' in api,
    'priority': 'priority' in api,
    'waiting status': 'pending' in api and 'contacted' in api and 'cancelled' in api,
    'ordered position': 'position' in api,
    'date filter': 'requested_date' in api,
    'Appwrite session boundary': 'azaad_admin_appwrite_session' in api and '/account' in api,
    'Neon data boundary': '@neondatabase/serverless' in api,
    'doctor isolation': 'doctor_id' in api and "role==='DOCTOR'" in api,
    'no browser-side appointment creation': "clinic_bookings" not in ui,
    'runtime injection': 'waiting-list-center.js' in patch,
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Waiting List contract gate failed: ' + ', '.join(failed))
print(f'Waiting List contract gate passed: {len(checks)}/{len(checks)}')
