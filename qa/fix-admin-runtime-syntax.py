"""Canonical Admin runtime repair and syntax gate.

This runs after all Admin source transforms and before production verification.
It closes the exact failure mode where a generated ROLE_PERMISSIONS array is
left syntactically invalid (for example a missing comma before finance.view),
which prevents admin.js from parsing at all. When admin.js does not parse, the
login submit handler never attaches and the browser performs a native form
submit/reload, making the password disappear and restoring the username field.
"""
from pathlib import Path
import re
import subprocess

ADMIN_JS = Path("admin.js")
if not ADMIN_JS.exists():
    raise SystemExit("admin.js missing")

text = ADMIN_JS.read_text(encoding="utf-8")

# Normalize every permission entry inside ROLE_PERMISSIONS blocks so every
# entry is comma-terminated. Trailing commas are valid JavaScript and make the
# generated block stable across repeated build transforms.
role_block = re.compile(r"(?P<head>\b(?:OWNER|ADMIN|MANAGER|SECRETARY|RECEPTION|CASHIER|DOCTOR|MARKETING):\s*\[)(?P<body>.*?)(?P<tail>\])", re.S)
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

# Publish explicit readiness markers consumed by production E2E. They are
# diagnostic state only and contain no credentials.
if "window.AZAAD_SUPABASE_READY = true;" not in text:
    marker = "const supabase = createClient("
    if marker not in text:
        raise SystemExit("Could not locate canonical Supabase client marker")
    # Place the marker immediately after the createClient expression closes.
    close = text.find("\n);", text.find(marker))
    if close == -1:
        raise SystemExit("Could not locate Supabase client terminator")
    insert_at = close + len("\n);")
    text = text[:insert_at] + "\nwindow.AZAAD_SUPABASE_READY = true;" + text[insert_at:]

if "window.AZAAD_LOGIN_CONTROLLER_READY = true;" not in text:
    marker = "function bindLogin() {"
    if marker not in text:
        raise SystemExit("Could not locate canonical login controller")
    # The marker is safe to expose before submit; it only says the controller
    # source parsed and the binder exists.
    text = text.replace(marker, "window.AZAAD_LOGIN_CONTROLLER_READY = true;\n\n" + marker, 1)

ADMIN_JS.write_text(text, encoding="utf-8")

# Fail closed: the actual production controller must be syntactically valid.
subprocess.run(["node", "--check", str(ADMIN_JS)], check=True)

print("[AZAAD admin syntax] PASS: admin.js normalized and node --check succeeded")
