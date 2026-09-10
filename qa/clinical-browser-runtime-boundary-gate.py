from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATHS = (
    ROOT / 'clinician-longitudinal-dashboard.js',
    ROOT / '.github' / 'patch-admin.py',
)
FORBIDDEN = (
    r'\bSUPABASE_URL\b',
    r'\bSUPABASE_PUBLISHABLE_KEY\b',
    r'\bcreateClient\s*\(',
    r'https?://[^\s\"\']*supabase\.co',
    r'\bsupabase\.auth\.',
    r'\bwindow\.supabase\b',
)

runtime = PATHS[0]
if not runtime.is_file():
    raise SystemExit('FAIL-CLOSED: clinician longitudinal runtime missing')
text = runtime.read_text(encoding='utf-8')
executable = re.sub(r'/\*[\s\S]*?\*/', '', text)
executable = re.sub(r'(^|\n)\s*//.*?(?=\n|$)', r'\1', executable)
violations = [pattern for pattern in FORBIDDEN if re.search(pattern, executable, flags=re.I)]
if violations:
    raise SystemExit('FAIL-CLOSED: clinician browser runtime contains retired Supabase boundary: ' + ', '.join(violations))

if "/api/clinical-assessments?action=history" not in text:
    raise SystemExit('FAIL-CLOSED: clinician longitudinal runtime must use the canonical clinical assessment API')
if "credentials:'include'" not in text:
    raise SystemExit('FAIL-CLOSED: clinician longitudinal runtime must send the server-managed Appwrite session cookie')

patcher = PATHS[1].read_text(encoding='utf-8') if PATHS[1].is_file() else ''
if 'clinician-longitudinal-dashboard.js' not in patcher:
    raise SystemExit('FAIL-CLOSED: clinician longitudinal dashboard is not part of the canonical Admin/clinical injection contract')

print('[AZAAD clinical browser runtime boundary] PASS: clinician longitudinal dashboard uses same-origin Neon/Appwrite API only')
