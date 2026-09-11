#!/usr/bin/env python3
"""Fail-closed contract for Scheduling V2's canonical production transform."""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
t=(ROOT/'qa'/'finalize-scheduling-v2-appwrite.py').read_text(encoding='utf-8')
s=(ROOT/'scheduling-v2.js').read_text(encoding='utf-8')
checks={
  'canonical admin appointments boundary': "API='/api/admin-appointments?resource=scheduling'" in t,
  'authenticated browser fetch': "credentials:'include'" in t and "cache:'no-store'" in t,
  'doctor role is explicitly scoped': "role!=='DOCTOR'" in t and "staff?.doctor_id" in t,
  'doctor rows are filtered by binding': "table==='doctors'||table==='bookings'||table==='schedules'||table==='overrides'" in t and "table==='waiting'" in t,
  'doctor cannot use patient search in booking UI': "toUpperCase()==='DOCTOR')return[]" in t,
  'mutating actions are preserved': all(x in s for x in ('BOOK','RESCHEDULE','TRANSFER','CANCEL','NO_SHOW','ADD_WAITING','ASSIGN_WAITING')),
  'canonical POST boundary is used': "async function invoke(action,body){ return api('POST',{}, {action,...body}); }" in t,
  'legacy runtime replacement is fail-closed': "Supabase runtime marker survived scheduling-v2 transform" in t and "window.AZAAD?.supabase || null" in t,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(('PASS' if v else 'FAIL')+': '+k)
if failed: raise SystemExit('Scheduling V2 contract failed: '+', '.join(failed))
print(f'Scheduling V2 contract passed: {len(checks)}/{len(checks)}')
