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
    "if (!result?.authenticated || result?.provider !== 'appwrite' || !result?.staff)")
text = text.replace(
    "state.session = result.session; state.user = result.user || result.session.user || null; state.provider = 'appwrite';",
    "state.session = { user: result.user || null }; state.user = result.user || null; state.provider = 'appwrite';"
)
if 'session: { access_token:' in text:
    raise SystemExit('Final Admin restore boundary: secret-bearing session object remains in browser Admin controller')

# Final canonicalization: publish exactly one restore owner. If an earlier transform
# left the owner below startup, physically relocate the complete function so the
# JavaScript execution order is deterministic rather than merely asserting it.
owner_re = r'window\.AZAAD_RESTORE_STAFF_PROFILE\s*=\s*async\s+function\s+restoreStaffProfile\s*\(\s*\)'
owners = list(re.finditer(owner_re, text))
if not owners:
    fn = re.search(r'async function restoreStaffProfile\s*\(\s*\)\s*\{', text)
    if not fn:
        raise SystemExit('Final Admin restore boundary: restoreStaffProfile implementation is missing')
    text = text[:fn.start()] + 'window.AZAAD_RESTORE_STAFF_PROFILE = ' + text[fn.start():]
    owners = list(re.finditer(owner_re, text))
if len(owners) != 1:
    raise SystemExit(f'Final Admin restore boundary: canonical global restore owner must exist exactly once (found {len(owners)})')

# Canonicalize compatibility restoreSession callers too. finalize-appwrite-admin-auth.py
# may intentionally reduce restoreSession to a thin wrapper; that wrapper must still
# invoke the same global owner rather than bypassing the final readiness boundary.
text = re.sub(
    r'(?<=return\s)restoreStaffProfile\s*\(\s*\)',
    'window.AZAAD_RESTORE_STAFF_PROFILE()',
    text,
)

startup_match = re.search(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']', text)
if not startup_match:
    raise SystemExit('Final Admin restore boundary: DOMContentLoaded startup owner is missing')

if owners[0].start() > startup_match.start():
    owner_start = owners[0].start()
    brace_start = text.find('{', owner_start)
    if brace_start < 0:
        raise SystemExit('FAIL-CLOSED: canonical restore owner body is missing')
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = brace_start
    end = None
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if c == '\n': line_comment = False
        elif block_comment:
            if c == '*' and n == '/': block_comment = False; i += 1
        elif quote:
            if escape: escape = False
            elif c == '\\': escape = True
            elif c == quote: quote = None
        elif c in "'\"`": quote = c
        elif c == '/' and n == '/': line_comment = True; i += 1
        elif c == '/' and n == '*': block_comment = True; i += 1
        elif c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
        i += 1
    if end is None:
        raise SystemExit('FAIL-CLOSED: canonical restore owner body is unterminated')
    if end < len(text) and text[end] == ';':
        end += 1
    owner_source = text[owner_start:end]
    text = text[:owner_start] + text[end:]
    startup_match = re.search(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']', text)
    if not startup_match:
        raise SystemExit('Final Admin restore boundary: DOMContentLoaded startup owner disappeared during relocation')
    insertion = startup_match.start()
    text = text[:insertion] + owner_source + '\n\n' + text[insertion:]

owners = list(re.finditer(owner_re, text))
if len(owners) != 1:
    raise SystemExit(f'Final Admin restore boundary: canonical global restore owner must exist exactly once after relocation (found {len(owners)})')
startup_match = re.search(r'document\.addEventListener\(\s*["\']DOMContentLoaded["\']', text)
if not startup_match:
    raise SystemExit('Final Admin restore boundary: DOMContentLoaded startup owner is missing')
if owners[0].start() > startup_match.start():
    raise SystemExit('FAIL-CLOSED: Appwrite restore owner is published after DOMContentLoaded startup')
if not re.search(r'window\.AZAAD_RESTORE_STAFF_PROFILE\s*\(\s*\)', text):
    raise SystemExit('Final Admin restore boundary: startup/restoreSession must call the canonical global Appwrite restore owner')

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