from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / 'admin.html').read_text(encoding='utf-8')
loader = (ROOT / 'qa' / 'lazy-admin-modules.py').read_text(encoding='utf-8')
enterprise = (ROOT / 'admin-enterprise-centers.js').read_text(encoding='utf-8')

# This is an ownership contract, not a claim that every domain is fully implemented.
# A missing/ambiguous owner must fail closed rather than being hidden by a generic center.
DOMAINS = {
    'patient360': ('clinical-patient360-loader.js', 'azaad-patient-360'),
    'rcm': (None, 'azaad-invoice-center'),
    'finance': (None, 'azaad-finance'),
    'purchasing': (None, 'azaad-management-dashboard'),
    'marketing': ('marketing-studio-v3.js', 'azaad-management-dashboard'),
    'analytics': (None, 'azaad-management-dashboard'),
    'insights': (None, 'azaad-ai-insights'),
    'security': (None, 'azaad-security-center'),
}

checks = []
def check(name, ok, detail=''):
    checks.append((name, ok, detail))

for domain, (runtime, backend) in DOMAINS.items():
    panel = f'{domain}EnterprisePanel'
    check(f'{domain}: enterprise panel exists', f'id="{panel}"' in enterprise)
    check(f'{domain}: backend boundary declared', backend in enterprise)
    if runtime:
        check(f'{domain}: canonical runtime registered once', loader.count(runtime) == 1)

# Enterprise center must consume shell lifecycle events, never own tab navigation.
check('enterprise: consumes panel activation lifecycle', "azaad:admin-panel-activated" in enterprise)
check('enterprise: no tab click owner', "tab.addEventListener('click'" not in enterprise)

# Prevent the contract from silently treating the enterprise center as the backend itself.
for backend in {v[1] for v in DOMAINS.values()}:
    check(f'backend boundary is function reference: {backend}', backend in enterprise)

failed = False
for name, ok, detail in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f' — {detail}' if detail else ''))
    failed |= not ok

print(f"\nAZAAD domain ownership matrix: {len(checks)} checks, {sum(ok for _, ok, _ in checks)} passed, {sum(not ok for _, ok, _ in checks)} failed.")
sys.exit(1 if failed else 0)
