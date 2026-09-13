#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
studio = (ROOT / 'marketing-studio-v4.js').read_text(encoding='utf-8').lower()
team = (ROOT / 'public-team-display.js').read_text(encoding='utf-8').lower()
public_data = (ROOT / 'api/public-clinic-data.js').read_text(encoding='utf-8').lower()
lazy = (ROOT / 'qa/lazy-admin-modules.py').read_text(encoding='utf-8').lower()

checks = {
    'canonical studio exists': (ROOT / 'marketing-studio-v4.js').is_file(),
    'multi-channel support': all(x in studio for x in ('facebook', 'instagram', 'linkedin', 'tiktok')),
    'campaign workspace': all(x in studio for x in ('campaign', 'clinic_marketing_publications')),
    'free-first AI assistance': 'free ai suggest' in studio,
    'human approval boundary': any(x in studio for x in ('human-approved publishing', 'human confirmation', 'approval')),
    'canonical lazy owner': 'marketing-studio-v4.js' in lazy and 'marketing-studio-v3.js' not in lazy,
    'public team data uses canonical API': 'api/public-clinic-data?scope=team' in team,
    'public data boundary is server-owned': 'export default' in public_data or 'module.exports' in public_data,
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'} | {name}")
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Marketing Studio V4 gate failed: ' + ', '.join(failed))
print(f'PASS | {len(checks)} canonical Marketing Studio V4 checks')
