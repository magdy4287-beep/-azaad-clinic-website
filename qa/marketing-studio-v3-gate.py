#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
marketing = (ROOT / 'marketing-studio-v3.js').read_text(encoding='utf-8')

checks = {
    'canonical studio exists': 'marketingV3' in marketing,
    'rich post composer': 'Rich Social Post' in marketing and 'm3New' in marketing,
    'image and video support': "type==='video'" in marketing and 'image' in marketing,
    'real media upload': "storage.from('clinic-media').upload" in marketing,
    'multi-channel distribution': 'Multi-channel Distribution' in marketing,
    'campaign workspace': 'Clinic Campaigns' in marketing and 'New Campaign' in marketing,
    'channel registry': 'clinic_marketing_channels' in marketing,
    'publication handoff': 'clinic_marketing_publications' in marketing and "status:'ready'" in marketing,
    'human approval language': 'human-approved publishing' in marketing or 'human confirmation' in marketing,
    'AI assistance': 'azaad-marketing-ai' in marketing and 'AI Suggest' in marketing,
    'free-first': 'No automatic ad spend' in marketing,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'} | {name}")
if failed:
    raise SystemExit('Marketing Studio V3 gate failed: ' + ', '.join(failed))
print(f'PASS | {len(checks)} canonical Marketing Studio V3 checks')
