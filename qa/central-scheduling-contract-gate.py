#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[1]
contract=(root/'central-scheduling-contract.js').read_text(encoding='utf-8')
for token in ['STATUS','AVAILABLE','CONFIRMED','PENDING','NO_SHOW','CANCELLED','CLOSED','validateSlot','canDoctorViewSlot']:
    if token not in contract: raise SystemExit(f'missing scheduling contract token: {token}')
center=(root/'central-scheduling-center.js').read_text(encoding='utf-8')
for token in ['buildSlot','groupByDoctor','sortSlots']:
    if token not in center: raise SystemExit(f'missing scheduling center token: {token}')
print('Central Scheduling contract gate: PASS')
