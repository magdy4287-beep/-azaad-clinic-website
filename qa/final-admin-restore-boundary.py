from pathlib import Path
import subprocess

admin = Path('admin.js')
text = admin.read_text(encoding='utf-8') if admin.is_file() else ''
if not admin.is_file():
    raise SystemExit('admin.js is required')
if text.count('async function restoreStaffProfile()') != 1:
    raise SystemExit('Final Admin restore boundary: expected exactly one top-level restoreStaffProfile owner')
if "fetch('/api/admin-auth'" not in text:
    raise SystemExit('Final Admin restore boundary: canonical Appwrite auth boundary missing')
if 'functions/v1/staff-login' in text:
    raise SystemExit('Final Admin restore boundary: legacy staff-login endpoint remains')

# Final post-transform syntax sweep. This runs after every canonical build mutation,
# including lazy-module injection, so browser syntax failures cannot hide behind
# an earlier admin.js-only syntax check.
failures = []
for path in sorted(Path('.').rglob('*.js')):
    if any(part in {'node_modules', '.git', 'test-results', 'playwright-report'} for part in path.parts):
        continue
    result = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True)
    if result.returncode:
        detail = (result.stderr or result.stdout).strip().replace('\n', ' | ')
        failures.append(f'{path}: {detail}')

if failures:
    print('[AZAAD final restore boundary] FAIL: post-transform JavaScript syntax sweep found invalid runtime files')
    for failure in failures:
        print(failure)
    raise SystemExit(1)

print('[AZAAD final restore boundary] PASS: exactly one top-level Appwrite restoreStaffProfile owner; post-transform JS syntax sweep passed')