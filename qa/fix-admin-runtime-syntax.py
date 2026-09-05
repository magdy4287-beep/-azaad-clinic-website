"""Canonical Admin runtime syntax repair gate.

This stage runs before the final Appwrite normalization stage. It is therefore
responsible only for source-level syntax normalization and login-listener
structure; the Appwrite stage owns retirement of the legacy browser client and
its final runtime boundary.
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

# Remove any stale readiness marker from an earlier transform version. The
# final Appwrite auth stage publishes the single canonical readiness marker.
text = re.sub(
    r"\n?window\.AZAAD_LOGIN_CONTROLLER_READY\s*=\s*true;\s*\n?",
    "\n",
    text,
    count=1,
)

# The listener-backed readiness marker is deliberately checked/installed by
# the final Appwrite stage, which is the final owner of Admin auth startup.
ADMIN_JS.write_text(text, encoding="utf-8")
subprocess.run(["node", "--check", str(ADMIN_JS)], check=True)

print("[AZAAD admin syntax] PASS: role syntax normalized and admin.js node --check succeeded; Appwrite normalization remains the final auth owner")