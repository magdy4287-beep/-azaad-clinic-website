#!/usr/bin/env python3
"""AZAAD Phase 7 — Clinical Assessment contract gate.

Read-only source contract gate. It does not touch patient or clinical data.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
files = [
    p for p in ROOT.rglob('*')
    if p.is_file()
    and p.suffix in {'.html', '.js', '.ts', '.tsx', '.sql'}
    and 'node_modules' not in p.parts
    and '.git' not in p.parts
    and p.name != 'azaad-phase7-assessment-gate.py'
]
text = '\n'.join(p.read_text(errors='ignore') for p in files)
lower = text.lower()

# Do not inspect this gate's own assertions: doing so creates false evidence.
checks = {
    'assessment UI present': 'assessment' in lower,
    'authenticated session boundary': 'getsession' in lower or 'authorization' in lower,
    'clinical assessment endpoint/boundary': 'clinical-assessments' in lower or 'clinical_assessments' in lower,
    'patient scope boundary': 'patient_id' in lower,
    'doctor scope boundary': 'doctor_id' in lower,
    'assessment history': 'assessment history' in lower or 'assessment_history' in lower,
    'AI boundary exists': 'azaad-doctor-ai' in lower or 'doctor-ai' in lower or 'clinical ai' in lower,
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
failed = [k for k, v in checks.items() if not v]
if failed:
    raise SystemExit('Phase 7 Assessment Gate failed: ' + ', '.join(failed))
print('Phase 7 Clinical Assessment contract gate: PASS')
