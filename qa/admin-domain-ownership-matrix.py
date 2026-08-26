from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / 'admin.html').read_text(encoding='utf-8')
loader = (ROOT / 'qa' / 'lazy-admin-modules.py').read_text(encoding='utf-8')
finalize = (ROOT / 'qa' / 'finalize-enterprise-admin.py').read_text(encoding='utf-8')
enterprise = (ROOT / 'admin-enterprise-centers.js').read_text(encoding='utf-8')
purchasing = (ROOT / 'admin-purchasing-center.js').read_text(encoding='utf-8')

# Ownership contract. This is intentionally evidence-based: a domain may use
# the enterprise overview owner or a dedicated canonical runtime, but never both.
DOMAINS = {
    'patient360': ('clinical-patient360-loader.js', 'azaad-patient-360', 'enterprise'),
    'rcm': (None, 'azaad-invoice-center', 'enterprise'),
    'finance': (None, 'azaad-finance', 'enterprise'),
    'purchasing': ('admin-purchasing-center.js', 'azaad-content-center', 'dedicated'),
    'marketing': ('marketing-studio-v3.js', 'azaad-management-dashboard', 'enterprise'),
    'analytics': (None, 'azaad-management-dashboard', 'enterprise'),
    'insights': (None, 'azaad-ai-insights', 'enterprise'),
    'security': (None, 'azaad-security-center', 'enterprise'),
}

checks = []
def check(name, ok, detail=''):
    checks.append((name, ok, detail))

for domain, (runtime, backend, owner_kind) in DOMAINS.items():
    panel = f'{domain}EnterprisePanel'
    check(f'{domain}: enterprise panel exists', f'id="{panel}"' in admin)
    source = purchasing if domain == 'purchasing' else enterprise
    check(f'{domain}: backend boundary declared', backend in source)
    if runtime:
        if domain == 'purchasing':
            check(f'{domain}: dedicated runtime is mapped once', finalize.count("'purchasingEnterprisePanel': ['admin-purchasing-center.js']") == 1)
            check(f'{domain}: dedicated runtime is not also owned by enterprise center', "purchasing" not in re.findall(r"D=\{.*?\};", enterprise, re.S)[0] if 'D={' in enterprise else True)
        else:
            check(f'{domain}: canonical runtime registered once', loader.count(runtime) == 1)

check('enterprise: consumes panel activation lifecycle', "azaad:admin-panel-activated" in enterprise)
check('enterprise: no tab click owner', "tab.addEventListener('click'" not in enterprise)
check('purchasing: dedicated runtime consumes panel activation lifecycle', "azaad:admin-panel-activated" in purchasing)
check('purchasing: no browser-local clinic_purchases query', ".from('clinic_purchases')" not in purchasing and '.from("clinic_purchases")' not in purchasing)
check('purchasing: uses authenticated Edge Function request', 'Authorization' in purchasing and 'azaad-content-center?api=purchases' in purchasing)
check('purchasing: supports read/create/update/delete', all(x in purchasing for x in ["call('GET')", "call('POST'", "call('PATCH'", "call('DELETE'" ]))

# Every declared backend must be represented by its actual owner source.
for domain, (_, backend, owner_kind) in DOMAINS.items():
    source = purchasing if owner_kind == 'dedicated' else enterprise
    check(f'backend boundary is function reference: {domain} -> {backend}', backend in source)

failed = False
for name, ok, detail in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f' — {detail}' if detail else ''))
    failed |= not ok

print(f"\nAZAAD domain ownership matrix: {len(checks)} checks, {sum(ok for _, ok, _ in checks)} passed, {sum(not ok for _, ok, _ in checks)} failed.")
sys.exit(1 if failed else 0)
