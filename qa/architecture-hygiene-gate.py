from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / '.github' / 'workflows'
REGISTRY = ROOT / 'docs' / 'AZAAD_WORKFLOW_OWNERSHIP_REGISTRY.md'
SELF = Path(__file__).resolve()

failures = []
workflow_paths = sorted(WORKFLOWS.glob('*.yml')) + sorted(WORKFLOWS.glob('*.yaml'))

for path in workflow_paths:
    text = path.read_text(encoding='utf-8', errors='replace')
    if re.search(r'git\s+(push|commit)\b', text, re.I):
        failures.append(f'{path}: workflow must not mutate git history')
    if re.search(r'gh\s+pr\s+(merge|close)\b', text, re.I):
        failures.append(f'{path}: workflow must not merge/close PRs')

RETIRED_PUSH_BRANCHES = {'feat/ai-operating-system-20260815'}
for path in workflow_paths:
    text = path.read_text(encoding='utf-8', errors='replace')
    for branch in RETIRED_PUSH_BRANCHES:
        if re.search(rf'([\'"\s-]|^){re.escape(branch)}($|[\'"\s])', text):
            failures.append(f'{path}: retired feature branch must not be a workflow trigger: {branch}')

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

# Canonical Vercel API ownership is one function boundary. All legacy domain
# handlers are imported as non-function implementation modules by the catch-all.
canonical_gateway = ROOT / 'api' / '[...route].js'
if not canonical_gateway.is_file():
    failures.append('api gateway: expected api/[...route].js canonical entrypoint')
else:
    gateway_text = canonical_gateway.read_text(encoding='utf-8', errors='replace')
    for owner in ('facility-mode', 'ai-insights', 'clinical-ai-cockpit', 'public-booking', 'admissions', 'marketing'):
        if f"'{owner}'" not in gateway_text:
            failures.append(f'api gateway: canonical route missing: {owner}')
    for owner in ('admin-auth', 'admin-appointments', 'staff-admin'):
        if f"'{owner}'" not in gateway_text:
            failures.append(f'api gateway: security route missing: {owner}')

# The implementation modules must not themselves be Vercel function boundaries.
for owner in ('admin-auth', 'admin-appointments', 'staff-admin', 'clinical-assessments', 'emergency-department', 'icu', 'insurance-admission', 'invoices', 'nursing', 'patient-financial-summary', 'pharmacy', 'public-clinic-data', 'public-scheduling', 'public-team-admin', 'purchases', 'waiting-list'):
    implementation = ROOT / 'api' / f'_{owner}.js'
    if not implementation.is_file():
        failures.append(f'api gateway implementation missing: api/_{owner}.js')

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
print(' - one canonical Vercel API function boundary')
print(' - security APIs remain explicit gateway routes')
print(f' - workflow registry is complete ({len(workflow_paths)} workflows)')
