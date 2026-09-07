from pathlib import Path
import re

admin = Path('admin.js')
staff = Path('staff-management.js')
if not admin.is_file() or not staff.is_file():
    raise SystemExit('FAIL-CLOSED: canonical Admin/staff runtime files are missing')

admin_text = admin.read_text(encoding='utf-8')
executable = re.sub(r'/\*.*?\*/', '', admin_text, flags=re.S)
executable = re.sub(r'(^|\s)//[^\n]*', r'\1', executable)

if re.search(r'window\.AZAAD_STAFF\s*&&\s*typeof\s+window\.AZAAD_STAFF\.(?:init|load)', executable):
    raise SystemExit('FAIL-CLOSED: Admin critical path still invokes legacy AZAAD_STAFF init/load')
if re.search(r'window\.AZAAD_STAFF\.(?:init|load)\s*\(', executable):
    raise SystemExit('FAIL-CLOSED: direct legacy AZAAD_STAFF init/load call remains')

staff_text = staff.read_text(encoding='utf-8')
if '/api/staff-admin' not in staff_text or "credentials:'include'" not in staff_text:
    raise SystemExit('FAIL-CLOSED: canonical Staff Management runtime is missing protected API boundary')
if 'azaad:admin-panel-activated' not in staff_text:
    raise SystemExit('FAIL-CLOSED: Staff Management is not panel-activation driven')

print('[AZAAD staff caller gate] PASS: Admin auth path has no legacy staff init/load caller; Staff Management is panel-activated and API-protected')
