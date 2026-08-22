from pathlib import Path
import subprocess
import sys

STEPS = [
    ["python3", "qa/inject-central-i18n.py"],
    ["python3", "qa/inject-responsive-shell.py"],
    ["python3", ".github/patch-admin.py"],
    ["python3", ".github/finalize-auth.py"],
    ["python3", "qa/fix-production-contracts.py"],
    ["python3", ".github/inject-patient-actions.py"],
    ["python3", ".github/inject-doctor-actions.py"],
    ["python3", "qa/lazy-admin-modules.py"],
    ["python3", "qa/verify-production-contracts.py"],
]

for command in STEPS:
    path = Path(command[1])
    if not path.is_file():
        raise SystemExit(f"Missing required production build step: {path}")
    print(f"[AZAAD build] {' '.join(command)}", flush=True)
    subprocess.run(command, check=True)

print("[AZAAD build] production transformation pipeline completed", flush=True)
