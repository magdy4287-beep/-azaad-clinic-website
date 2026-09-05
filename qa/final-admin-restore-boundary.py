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

# The Admin certification boundary validates the canonical Admin runtime only.
# Repository-wide legacy/isolated JS is governed by its own surface-specific gates.
RUNTIME_JS = {
    'admin.js',
    'admin-enhancements-v1.js', 'admin-english-hardening.js',
    'admin-patient-icon-guard.js', 'azaad-role-experience.js',
    'patient-appointment-actions.js', 'appointment-cancellation-ui.js',
    'patient-financial-summary.js', 'patient-clinical-history.js',
    'doctors-center-v2.js', 'doctor-staff-binding.js', 'doctor-staff-convert.js',
    'services-center-v2.js', 'scheduling-v2.js',
    'marketing-studio-v3.js', 'marketing-intelligence-loader.js',
    'staff-management.js', 'patient-merge-tool.js', 'hr-performance-analytics.js',
    'admin-calendar-center.js',
}

failures = []
for name in sorted(RUNTIME_JS):
    path = Path(name)
    if not path.is_file():
        failures.append(f'{path}: canonical runtime file is missing')
        continue
    result = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True)
    if result.returncode:
        detail = (result.stderr or result.stdout).strip().replace('\n', ' | ')
        failures.append(f'{path}: {detail}')

if failures:
    print('[AZAAD final restore boundary] FAIL: canonical Admin runtime syntax sweep found invalid files')
    for failure in failures:
        print(failure)
    raise SystemExit(1)

print('[AZAAD final restore boundary] PASS: one top-level Appwrite restoreStaffProfile owner; canonical Admin runtime syntax sweep passed')