from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / 'admin.html').read_text(encoding='utf-8')
loader = (ROOT / 'qa' / 'lazy-admin-modules.py').read_text(encoding='utf-8')
enterprise = (ROOT / 'admin-enterprise-centers.js').read_text(encoding='utf-8')
purchasing = (ROOT / 'admin-purchasing-center.js').read_text(encoding='utf-8')

registry_match = re.search(r'data-azaad-admin-module-registry=["\']1["\'][^>]*>(.*?)</script>', admin, re.I | re.S)
registry_body = registry_match.group(1) if registry_match else ''

DOMAINS = {
    'patient360': (None, 'azaad-patient-360', 'enterprise'),
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
    check(f'{domain}: backend boundary declared', backend in (purchasing if owner_kind == 'dedicated' else enterprise))
    if owner_kind == 'enterprise':
        mapping = f"'{panel}': ['admin-enterprise-centers.js']"
        check(f'{domain}: canonical enterprise runtime is mapped exactly once', registry_body.count(mapping) == 1)
    if runtime:
        if domain == 'purchasing':
            mapping = "'purchasingEnterprisePanel': ['admin-purchasing-center.js']"
            check(f'{domain}: dedicated runtime is mapped once in generated registry', registry_body.count(mapping) == 1)
            check(f'{domain}: dedicated runtime is not also owned by enterprise center', 'purchasing' not in re.findall(r"D=\{.*?\};", enterprise, re.S)[0] if 'D={' in enterprise else True)
        else:
            check(f'{domain}: canonical runtime registered once', loader.count(runtime) == 1)

check('patient360: no superseded loader remains in QA ownership graph', 'clinical-patient360-loader.js' not in loader)
check('patient360: enterprise center owns patient360 rendering', "if(key==='patient360')" in enterprise and 'azaad-patient-360' in enterprise)
check('enterprise: consumes panel activation lifecycle', "azaad:admin-panel-activated" in enterprise)
check('enterprise: no tab click owner', "tab.addEventListener('click'" not in enterprise)
check('role navigation: canonical role owner is in Admin runtime CORE', '"azaad-role-experience.js"' in loader)
check('role navigation: reactivates active panel after role resolves', 'AZAAD_ADMIN_ACTIVATE_PANEL(active.dataset.panel, active)' in (ROOT / 'azaad-role-experience.js').read_text(encoding='utf-8'))
check('purchasing: dedicated runtime consumes panel activation lifecycle', "azaad:admin-panel-activated" in purchasing)
check('purchasing: no browser-local clinic_purchases query', ".from('clinic_purchases')" not in purchasing and '.from("clinic_purchases")' not in purchasing)
check('purchasing: uses authenticated Edge Function request', 'Authorization' in purchasing and 'azaad-content-center?api=purchases' in purchasing)
check('purchasing: exposes all CRUD HTTP methods', all(re.search(r"method\s*:\s*['\"]" + method + r"['\"]", purchasing) or re.search(r"call\([^\n]*['\"]" + method + r"['\"]", purchasing) for method in ('GET','POST','PATCH','DELETE')))

for domain, (_, backend, owner_kind) in DOMAINS.items():
    source = purchasing if owner_kind == 'dedicated' else enterprise
    check(f'backend boundary is function reference: {domain} -> {backend}', backend in source)

failed = False
for name, ok, detail in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f' — {detail}' if detail else ''))
    failed |= not ok

print(f"\nAZAAD domain ownership matrix: {len(checks)} checks, {sum(ok for _, ok, _ in checks)} passed, {sum(not ok for _, ok, _ in checks)} failed.")
sys.exit(1 if failed else 0)
