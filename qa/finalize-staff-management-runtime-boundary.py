from pathlib import Path
import re
import subprocess

path = Path('staff-management.js')
if not path.is_file():
    raise SystemExit('staff-management.js is required')

text = path.read_text(encoding='utf-8')

legacy_patterns = [
    (r'\bcreateSupabaseClient\s*\(', 'legacy Supabase client construction'),
    (r'\bsupabase\.auth\.', 'legacy Supabase auth runtime'),
    (r'\bSUPABASE_(?:URL|PUBLISHABLE_KEY)\b', 'legacy Supabase credential symbol'),
    (r'\bSTAFF_ADMIN_FUNCTION\b', 'legacy staff-admin endpoint symbol'),
    (r'https://[^\s"`\']+supabase\.co/functions/v1/staff-admin', 'legacy staff-admin URL'),
    (r'\bwaitForSupabase\b', 'legacy Supabase initialization waiter'),
]

legacy = [label for pattern, label in legacy_patterns if re.search(pattern, text)]
if legacy:
    print(f'[AZAAD final staff boundary] residual legacy runtime detected: {", ".join(legacy)}')
    subprocess.run(['python3', 'qa/finalize-staff-management-appwrite.py'], check=True)
    text = path.read_text(encoding='utf-8')

for pattern, label in legacy_patterns:
    if re.search(pattern, text):
        raise SystemExit(f'FAIL-CLOSED: {label} remains in final staff-management.js')

if not re.search(r"fetch\(\s*['\"]/api/staff-admin['\"]", text):
    raise SystemExit('FAIL-CLOSED: canonical /api/staff-admin boundary is missing from final staff-management.js')
if not re.search(r"credentials\s*:\s*['\"]include['\"]", text):
    raise SystemExit('FAIL-CLOSED: HttpOnly browser credential forwarding is missing from final staff-management.js')

print('[AZAAD final staff boundary] PASS: staff-management.js is Appwrite/HttpOnly + Neon API only')
