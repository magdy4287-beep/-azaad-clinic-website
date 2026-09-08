from pathlib import Path
import re

PATH = Path('admin.js')
if not PATH.is_file():
    raise SystemExit('admin.js is required')

text = PATH.read_text(encoding='utf-8')

# The legacy browser client was already retired. Remove the final executable
# object-property reference that can otherwise throw ReferenceError before the
# canonical Appwrite readiness marker is published.
text = re.sub(r'(?m)^\s*supabase,\s*\n', '', text, count=1)
text = re.sub(r'\n?window\.AZAAD_LOGIN_CONTROLLER_READY\s*=\s*true;\s*\n?', '\n', text)
text = text.rstrip() + '\n\nwindow.AZAAD_LOGIN_CONTROLLER_READY = true;\n'

# Fail closed on executable lowercase Supabase browser identifiers. Comments
# and legacy explanatory strings are intentionally ignored; runtime identifiers
# must not survive the Appwrite browser boundary.
executable = re.sub(r'/\*[\s\S]*?\*/', '', text)
executable = re.sub(r'(^|\n)\s*//.*?(?=\n|$)', r'\1', executable)
if re.search(r'\bsupabase\b', executable):
    raise SystemExit('Legacy executable Supabase browser identifier remains in admin.js')

# The marker must be reachable after the canonical Appwrite controller has been
# installed. It is intentionally published exactly once by this final boundary.
if text.count('window.AZAAD_LOGIN_CONTROLLER_READY = true;') != 1:
    raise SystemExit('Admin login controller readiness marker must exist exactly once')

PATH.write_text(text, encoding='utf-8')
print('Admin browser runtime reference boundary: PASS — no executable Supabase identifier; canonical login readiness marker published exactly once')
