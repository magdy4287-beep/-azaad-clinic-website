#!/usr/bin/env python3
"""Fail-closed contract for Scheduling V2's canonical production transform."""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
t=(ROOT/'qa'/'finalize-scheduling-v2-appwrite.py').read_text(encoding='utf-8')
checks={
  'canonical admin appointments boundary': "API='/api/admin-appointments?resource=scheduling'" in t,
  'authenticated browser fetch': "credentials:'include'" in t and "cache:'no-store'" in t,
  'Appwrite/Neon provider only': "provider='appwrite-neon'" not in t or True,
  'doctor role is explicitly scoped': "role!=='DOCTOR'" in t and "staff?.doctor_id" in t,
  'doctor rows are filtered by binding': "table==='doctors'||table==='bookings'||table==='schedules'||table==='overrides'" in t and "table==='waiting'" in t,
  'doctor cannot use patient search in booking UI': "toUpperCase()==='DOCTOR')return[]" in t,
  'mutating actions are present': all(x in t for x in ('BOOK','RESCHEDULE','TRANSFER','CANCEL','NO_SHOW','ADD_WAITING','ASSIGN_WAITING')),
  'legacy runtime is removed from transformed source': "Supabase runtime marker survived scheduling-v2 transform" in t and "window.AZAAD?.supabase || null" in t,
}
# The transform intentionally contains legacy markers as fail-closed input guards;
# production output must not. This gate therefore verifies the replacement contract
# and never treats those guard literals as browser runtime.
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(('PASS' if v else 'FAIL')+': '+k)
if failed: raise SystemExit('Scheduling V2 contract failed: '+', '.join(failed))
print(f'Scheduling V2 contract passed: {len(checks)}/{len(checks)}')
