from pathlib import Path
import subprocess

STEPS = [
    ["python3", "qa/inject-central-i18n.py"],
    ["python3", "qa/inject-responsive-shell.py"],
    ["python3", ".github/patch-admin.py"],
    ["python3", ".github/finalize-auth.py"],
    ["python3", "qa/fix-production-contracts.py"],
    ["python3", ".github/inject-patient-actions.py"],
    ["python3", ".github/inject-doctor-actions.py"],
    ["python3", "qa/lazy-admin-modules.py"],
]

for command in STEPS:
    path = Path(command[1])
    if not path.is_file():
        raise SystemExit(f"Missing required production build step: {path}")
    print(f"[AZAAD build] {' '.join(command)}", flush=True)
    subprocess.run(command, check=True)

# The initial injector handles checked-in source. Downstream transforms can add
# relative central-i18n.js tags, so canonicalize the final artifact immediately
# before verification.
final_i18n = ["python3", "qa/finalize-central-i18n.py"]
print(f"[AZAAD build] {' '.join(final_i18n)}", flush=True)
subprocess.run(final_i18n, check=True)

# Verify the entire generated HTML surface, not only the two primary entrypoints.
invariants = ["python3", "qa/production-artifact-invariants.py"]
print(f"[AZAAD build] {' '.join(invariants)}", flush=True)
subprocess.run(invariants, check=True)

verify = ["python3", "qa/verify-production-contracts.py"]
print(f"[AZAAD build] {' '.join(verify)}", flush=True)
subprocess.run(verify, check=True)

print("[AZAAD build] production transformation pipeline completed", flush=True)
