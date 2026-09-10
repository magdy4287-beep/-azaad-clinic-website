from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / 'admin.html').read_text(encoding='utf-8')
loader = (ROOT / 'qa' / 'lazy-admin-modules.py').read_text(encoding='utf-8')
enterprise = (ROOT / 'admin-enterprise-centers.js').read_text(encoding='utf-8')
purchasing = (ROOT / 'admin-purchasing-center.js').read_text(encoding='utf-8')
purchasing_api = (ROOT / 'api' / 'purchases.js').read_text(encoding='utf-8')

registry_match = re.search(r'data-azaad-admin-module-registry=["\']1["\'][^>]*>(.*?)</script>', admin, re.I | re.S)
registry_body = registry_match.group(1) if registry_match else ''

DOMAINS = {
    'patient360': '/api/patient-financial-summary',
    'rcm': '/api/invoices?limit=200',
    'analytics': '/api/admin-appointments',
    'insights': '/api/ai-insights',
    'finance': None,
    'marketing': None,
    'security': None,
}

checks = []
def check(name, ok, detail=''):
    checks.append((name, ok, detail))

for domain, backend in DOMAINS.items():
    check(f'{domain}: enterprise runtime declares canonical panel', f'{domain}:' in enterprise and 'const id=`${key}EnterprisePanel`' in enterprise)
    check(f'{domain}: enterprise runtime is singleton guarded', 'if (window.AZAAD_ENTERPRISE_CENTERS) return;' in enterprise)
    if backend:
        check(f'{domain}: backend boundary declared', backend in enterprise)
    else:
        check(f'{domain}: no false backend boundary is claimed', f"key==='{domain}'" in enterprise and 'بيانات الوحدة متاحة عبر حدود الخادم الآمنة' in enterprise)

check('patient360: no superseded loader remains in QA ownership graph', 'clinical-patient360-loader.js' not in loader)
check('patient360: enterprise center owns patient360 rendering', "key==='patient360'" in enterprise and '/api/patient-financial-summary' in enterprise)
check('enterprise: consumes panel activation lifecycle', "azaad:admin-panel-activated" in enterprise)
check('enterprise: no tab click owner', "tab.addEventListener('click'" not in enterprise)
check('role navigation: canonical role owner is in Admin runtime CORE', '"azaad-role-experience.js"' in loader)
check('role navigation: reactivates active panel after role resolves', 'AZAAD_ADMIN_ACTIVATE_PANEL(active.dataset.panel, active)' in (ROOT / 'azaad-role-experience.js').read_text(encoding='utf-8'))
check('purchasing: dedicated runtime consumes panel activation lifecycle', "azaad:admin-panel-activated" in purchasing)
check('purchasing: no Supabase URL/token/client remains', 'supabase.co' not in purchasing.lower() and 'SUPABASE_' not in purchasing and 'supabaseClient' not in purchasing and 'window.supabase' not in purchasing)
check('purchasing: same-origin API boundary declared', "const ENDPOINT = '/api/purchases'" in purchasing)
check('purchasing: exposes all CRUD HTTP methods', all(re.search(r"call\([^\n]*['\"]" + method + r"['\"]", purchasing) for method in ('GET','POST','PATCH','DELETE')))
check('purchasing API: canonical Appwrite session cookie', "azaad_admin_appwrite_session" in purchasing_api)
check('purchasing API: Neon database owner', "@neondatabase/serverless" in purchasing_api and 'clinic_purchases' in purchasing_api)
check('purchasing API: read roles fail closed', "READ_ROLES" in purchasing_api and "if (!READ_ROLES.has(identity.role))" in purchasing_api)
check('purchasing API: write roles are management-only', "const WRITE_ROLES = new Set(['OWNER','ADMIN','MANAGER'])" in purchasing_api and "if (!WRITE_ROLES.has(identity.role))" in purchasing_api)
check('purchasing API: no browser credential acceptance', 'Authorization' not in purchasing_api and 'SUPABASE_' not in purchasing_api and 'supabase.co' not in purchasing_api)
check('purchasing API: audit events emitted', "PURCHASE_CREATE" in purchasing_api and "PURCHASE_UPDATE" in purchasing_api and "PURCHASE_DELETE" in purchasing_api)

for domain, backend in DOMAINS.items():
    if backend:
        check(f'backend boundary is canonical API reference: {domain} -> {backend}', backend in enterprise)
    else:
        check(f'backend boundary is not falsely mapped: {domain}', True)

failed = False
for name, ok, detail in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f' — {detail}' if detail else ''))
    failed |= not ok

print(f"\nAZAAD domain ownership matrix: {len(checks)} checks, {sum(ok for _, ok, _ in checks)} passed, {sum(not ok for _, ok, _ in checks)} failed.")
sys.exit(1 if failed else 0)
