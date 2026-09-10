from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'patients-center.js'
if not path.is_file():
    raise SystemExit('FAIL-CLOSED: patients-center.js is missing')
text = path.read_text(encoding='utf-8')

text = re.sub(
    r"\s*const SUPABASE_URL\s*=.*?\n\s*const PATIENTS_API\s*=.*?\n\s*const APPOINTMENTS_API\s*=.*?\n\s*const SESSION_KEY\s*=.*?;",
    "\n  const PATIENTS_API = '/api/admin-appointments';\n  const APPOINTMENTS_API = '/api/admin-appointments';",
    text,
    count=1,
    flags=re.S,
)

text = re.sub(
    r"\s*function token\(\)\s*\{.*?\n\s*async function api\(url, options = \{\}\)\s*\{.*?\n\s*\}",
    """
  async function api(url, options = {}) {
    const r = await fetch(url, { ...options, credentials:'include', cache:'no-store', headers:{ Accept:'application/json', ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) } });
    let b = {}; try { b = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error(b?.error || b?.message || `HTTP ${r.status}`);
    return b;
  }""",
    text,
    count=1,
    flags=re.S,
)

text = re.sub(r"\s*function bind\(\)\s*\{.*?\n\s*\}", "\n  function bind() {}", text, count=1, flags=re.S)
text = text.replace("if(token()){loadPatients();loadAppointments()}", "if(window.AZAAD?.state?.staff){loadPatients();loadAppointments()}")

if re.search(r'\bSUPABASE_URL\b|\bSUPABASE_PUBLISHABLE_KEY\b|functions/v1/|https?://[^\s\"\']*supabase\.co|window\.AZAAD\?\.supabase|sessionStorage\.getItem\([\"\']azaad_admin_token', text, flags=re.I):
    raise SystemExit('FAIL-CLOSED: patients-center still contains retired Supabase/browser-token runtime')

path.write_text(text, encoding='utf-8')
print('[AZAAD patient-center Appwrite boundary] PASS: Patient Center uses same-origin Appwrite-Neon APIs and HttpOnly session')
