"""Canonical Admin runtime repair and syntax gate.

This runs after all Admin source transforms and before production verification.
It closes the exact failure mode where a generated ROLE_PERMISSIONS array is
left syntactically invalid and, critically, publishes the login-controller
readiness marker only after the real submit listener has been attached.
"""
from pathlib import Path
import re
import subprocess

ADMIN_JS = Path("admin.js")
if not ADMIN_JS.exists():
    raise SystemExit("admin.js missing")

text = ADMIN_JS.read_text(encoding="utf-8")

role_block = re.compile(
    r"(?P<head>\b(?:OWNER|ADMIN|MANAGER|SECRETARY|RECEPTION|CASHIER|DOCTOR|MARKETING):\s*\[)(?P<body>.*?)(?P<tail>\])",
    re.S,
)
entry = re.compile(r"^(\s*\"[^\"]+\")(\s*,?\s*)$")

def normalize_role(match: re.Match[str]) -> str:
    body = match.group("body")
    lines = body.splitlines()
    out = []
    for line in lines:
        m = entry.match(line)
        if m:
            out.append(f"{m.group(1)},")
        else:
            out.append(line)
    return match.group("head") + "\n".join(out) + match.group("tail")

text = role_block.sub(normalize_role, text)

# Publish an explicit Supabase readiness marker after the canonical client is
# created. This marker is diagnostic state only and contains no credentials.
if "window.AZAAD_SUPABASE_READY = true;" not in text:
    marker = "const supabase = createClient("
    if marker not in text:
        raise SystemExit("Could not locate canonical Supabase client marker")
    close = text.find("\n);", text.find(marker))
    if close == -1:
        raise SystemExit("Could not locate Supabase client terminator")
    insert_at = close + len("\n);")
    text = text[:insert_at] + "\nwindow.AZAAD_SUPABASE_READY = true;" + text[insert_at:]

# Remove any stale readiness marker from an earlier transform version.
text = re.sub(
    r"\n?window\.AZAAD_LOGIN_CONTROLLER_READY\s*=\s*true;\s*\n?",
    "\n",
    text,
    count=1,
)

# Readiness is a synchronization contract: it must become true only after the
# actual submit listener is installed, never merely because bindLogin exists.
marker = "    }\n  );\n}\n\n/* ============================================================\n   AUTH STATE"
if marker not in text:
    raise SystemExit("Could not locate canonical login listener terminator")
text = text.replace(
    marker,
    "    }\n  );\n\n  window.AZAAD_LOGIN_CONTROLLER_READY = true;\n}\n\n/* ============================================================\n   AUTH STATE",
    1,
)

ADMIN_JS.write_text(text, encoding="utf-8")
subprocess.run(["node", "--check", str(ADMIN_JS)], check=True)

print("[AZAAD admin syntax] PASS: admin.js normalized, node --check succeeded, and login readiness is listener-backed")
