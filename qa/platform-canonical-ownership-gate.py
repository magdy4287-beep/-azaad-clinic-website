from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs' / 'AZAAD_PLATFORM_CANONICAL_OWNERSHIP.md'
if not DOC.exists():
    raise SystemExit('FAIL: canonical ownership document missing')

# This gate is intentionally conservative: it catches obvious competing runtime
# owners without treating every helper filename as a duplicate implementation.
source_ext = {'.js', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.sql', '.html'}
files = [p for p in ROOT.rglob('*') if p.is_file() and p.suffix in source_ext and '.git' not in p.parts]

rules = {
    'local auth client creation': re.compile(r'createClient\s*\(', re.I),
    'Supabase runtime SDK import': re.compile(r'@supabase/(supabase-js|ssr)', re.I),
}

# Known legacy/isolated locations are handled by the dedicated retired-provider
# gate. This gate focuses on accidental ownership duplication in active code.
allow_create_client = {
    'qa/scheduling-contract-gate.py',
}

violations = []
for path in files:
    rel = path.relative_to(ROOT).as_posix()
    try:
        text = path.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        continue
    for name, pattern in rules.items():
        if pattern.search(text):
            if name == 'local auth client creation' and rel in allow_create_client:
                continue
            # Do not fail on the canonical provider declaration itself or on QA
            # contracts whose purpose is to inspect legacy residue.
            if rel in {'central-i18n.js', 'qa/platform-canonical-ownership-gate.py'}:
                continue
            if name == 'Supabase runtime SDK import':
                violations.append(f'{rel}: {name}')

# Canonical ownership document must explicitly preserve the four platform cores.
required = [
    'central-i18n.js',
    'canonical scheduling boundary',
    'central AI capability',
    'Neon',
    'Appwrite',
    'Vercel',
]
text = DOC.read_text(encoding='utf-8')
for marker in required:
    if marker not in text:
        raise SystemExit(f'FAIL: ownership contract missing {marker}')

if violations:
    print('FAIL: competing active provider/runtime references detected')
    for item in violations:
        print(item)
    raise SystemExit(1)

print(f'PASS: canonical ownership contract; scanned {len(files)} source files')
