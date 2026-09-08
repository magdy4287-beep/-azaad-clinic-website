from pathlib import Path
import subprocess
import re

admin = Path('admin.js')
text = admin.read_text(encoding='utf-8') if admin.is_file() else ''
if not admin.is_file():
    raise SystemExit('admin.js is required')
if text.count('async function restoreStaffProfile()') != 1:
    raise SystemExit('Final Admin restore boundary: expected exactly one restoreStaffProfile implementation')
if "fetch('/api/admin-auth'" not in text:
    raise SystemExit('Final Admin restore boundary: canonical Appwrite auth boundary missing')
if 'functions/v1/staff-login' in text:
    raise SystemExit('Final Admin restore boundary: legacy staff-login endpoint remains')

# Enforce the server-managed HttpOnly cookie as the only browser session carrier
# for the canonical login/restore controller. Identity metadata remains in state;
# the Appwrite session secret must never be serialized into the admin-auth response.
text = text.replace(
    "if (result?.provider !== 'appwrite' || !result?.session?.access_token || !result?.staff)",
    "if (result?.provider !== 'appwrite' || !result?.staff)"
)
text = text.replace(
    "if (!result?.authenticated || result?.provider !== 'appwrite' || !result?.staff || !result?.session?.access_token)",
    "if (!result?.authenticated || result?.provider !== 'appwrite' || !result?.staff)"
)
text = text.replace(
    "state.session = result.session; state.user = result.user || result.session.user || null; state.provider = 'appwrite';",
    "state.session = { user: result.user || null }; state.user = result.user || null; state.provider = 'appwrite';"
)
if 'session: { access_token:' in text:
    raise SystemExit('Final Admin restore boundary: secret-bearing session object remains in browser Admin controller')

# Refresh persistence is a real browser lifecycle. The restore owner must be
# assigned before DOMContentLoaded startup can invoke it. We intentionally use
# semantic matching rather than whitespace-sensitive matching because later
# canonical auth transforms may normalize the assignment formatting.
owner_re = r'window\.AZAAD_RESTORE_STAFF_PROFILE\s*=\s*async\s+function\s+restoreStaffProfile\s*\(\s*\)'
owners = list(re.finditer(owner_re, text))
if len(owners) != 1:
    # Accept a line break between the assignment and function expression as a
    # valid canonical form, but never accept a second owner.
    broad_owner_re = r'window\.AZAAD_RESTORE_STAFF_PROFILE\s*=\s*async\s+function\s+restoreStaffProfile\s*\('
    owners = list(re.finditer(broad_owner_re, text))
if len(owners) != 1:
    raise SystemExit(f'Final Admin restore boundary: canonical global restore owner must exist exactly once (found {len(owners)})')

startup_match = re.search(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']', text)
if not startup_match:
    raise SystemExit('Final Admin restore boundary: DOMContentLoaded startup owner is missing')
if owners[0].start() > startup_match.start():
    raise SystemExit('FAIL-CLOSED: Appwrite restore owner is published after DOMContentLoaded startup')
if not re.search(r'window\.AZAAD_RESTORE_STAFF_PROFILE\s*\(\s*\)', text):
    raise SystemExit('Final Admin restore boundary: startup must call the canonical global Appwrite restore owner')

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

admin.write_text(text, encoding='utf-8')
print('[AZAAD final restore boundary] PASS: one pre-startup Appwrite restore owner; cookie-only Admin auth response boundary; canonical runtime syntax sweep passed')
