#!/usr/bin/env python3
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'admin.html').read_text(encoding='utf-8')
checks = {
    'schedule cards expose weekday': 'data-weekday="${esc(x.weekday)}"' in html,
    'save payload includes weekday': 'weekday:\n                  Number(\n                    card.dataset.weekday' in html,
    'schedule id remains in payload': 'id:\n                  card.dataset\n                    .scheduleId' in html,
    'doctor id is submitted': 'doctor_id:\n                      doctorId' in html,
}
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Doctor schedule save contract failed: ' + ', '.join(failed))
print(f'Doctor schedule save contract passed: {len(checks)}/{len(checks)}')
