from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / '.github' / 'workflows'
SELF = Path(__file__).resolve()

failures = []

# Source-mutating CI is retired. Transformations belong to explicit build/QA
# scripts and must not silently rewrite the repository from a workflow.
for path in sorted(WORKFLOWS.glob('*.yml')) + sorted(WORKFLOWS.glob('*.yaml')):
    text = path.read_text(encoding='utf-8', errors='replace')
    if re.search(r'git\s+(push|commit)\b', text, re.I):
        failures.append(f'{path}: workflow must not mutate git history')
    if re.search(r'gh\s+pr\s+(merge|close)\b', text, re.I):
        failures.append(f'{path}: workflow must not merge/close PRs')

# Detect an actual repository deployment path, not the gate's own policy text.
# Documentation and this diagnostic are excluded because they necessarily name
# the retired provider while explaining the rule.
for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts or path.resolve() == SELF:
        continue
    if 'docs' in path.parts:
        continue
    if path.suffix.lower() not in {'.yml', '.yaml', '.json', '.js', '.ts', '.py', '.html'}:
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    if re.search(r'netlify\s+deploy|netlify\.toml|netlify-cli|netlify_app', text, re.I):
        failures.append(f'{path}: legacy Netlify deployment reference')

# Guard against obvious duplicate runtime owners for the same canonical API.
# This intentionally checks only explicit server entrypoints, not test fixtures.
api_dir = ROOT / 'api'
if api_dir.exists():
    canonical = {
        'admin-auth': ['admin-auth'],
        'admin-appointments': ['admin-appointments'],
        'staff-admin': ['staff-admin'],
    }
    for owner, needles in canonical.items():
        matches = [p for p in api_dir.glob('*.js') if any(n in p.stem for n in needles)]
        if len(matches) != 1:
            failures.append(f'api/{owner}: expected exactly one canonical file, found {len(matches)}')

if failures:
    print('ARCHITECTURE HYGIENE: FAIL-CLOSED')
    for failure in failures:
        print(f' - {failure}')
    sys.exit(1)

print('ARCHITECTURE HYGIENE: PASS')
print(' - no source-mutating workflow')
print(' - no repository Netlify deployment path')
print(' - canonical API ownership is singular')
