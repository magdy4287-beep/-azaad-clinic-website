from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / '.github' / 'workflows'
REGISTRY = ROOT / 'docs' / 'AZAAD_WORKFLOW_OWNERSHIP_REGISTRY.md'
SELF = Path(__file__).resolve()

failures = []
workflow_paths = sorted(WORKFLOWS.glob('*.yml')) + sorted(WORKFLOWS.glob('*.yaml'))

# Source-mutating CI is retired. Transformations belong to explicit build/QA
# scripts and must not silently rewrite the repository from a workflow.
for path in workflow_paths:
    text = path.read_text(encoding='utf-8', errors='replace')
    if re.search(r'git\s+(push|commit)\b', text, re.I):
        failures.append(f'{path}: workflow must not mutate git history')
    if re.search(r'gh\s+pr\s+(merge|close)\b', text, re.I):
        failures.append(f'{path}: workflow must not merge/close PRs')

# Historical feature branches are not valid CI deployment triggers. Keep this
# fail-closed because an accidental reintroduction would silently resurrect
# retired automation outside the canonical PR -> main path.
RETIRED_PUSH_BRANCHES = {'feat/ai-operating-system-20260815'}
for path in workflow_paths:
    text = path.read_text(encoding='utf-8', errors='replace')
    for branch in RETIRED_PUSH_BRANCHES:
        if re.search(rf'(^|[\'"\s-]){re.escape(branch)}($|[\'"\s])', text):
            failures.append(f'{path}: retired feature branch must not be a workflow trigger: {branch}')

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

# Keep the workflow registry and the executable workflow tree in lockstep.
# This prevents silent workflow accumulation: every active workflow must have
# one ownership row, and every row in the canonical table must point to a file.
if not REGISTRY.is_file():
    failures.append('workflow registry is missing: docs/AZAAD_WORKFLOW_OWNERSHIP_REGISTRY.md')
else:
    registry_text = REGISTRY.read_text(encoding='utf-8', errors='replace')
    section = registry_text.split('## Proven non-duplication decisions', 1)[0]
    registered = re.findall(r'^\| `([^`]+\.ya?ml)` \|', section, re.MULTILINE)
    workflow_names = [p.name for p in workflow_paths]
    duplicate_registry = sorted({name for name in registered if registered.count(name) > 1})
    missing_registry = sorted(set(workflow_names) - set(registered))
    orphan_registry = sorted(set(registered) - set(workflow_names))
    if duplicate_registry:
        failures.append('workflow registry contains duplicate ownership rows: ' + ', '.join(duplicate_registry))
    if missing_registry:
        failures.append('workflow registry missing active files: ' + ', '.join(missing_registry))
    if orphan_registry:
        failures.append('workflow registry references missing files: ' + ', '.join(orphan_registry))

if failures:
    print('ARCHITECTURE HYGIENE: FAIL-CLOSED')
    for failure in failures:
        print(f' - {failure}')
    sys.exit(1)

print('ARCHITECTURE HYGIENE: PASS')
print(' - no source-mutating workflow')
print(' - no retired feature-branch workflow trigger')
print(' - no repository Netlify deployment path')
print(' - canonical API ownership is singular')
print(f' - workflow registry is complete ({len(workflow_paths)} workflows)')
