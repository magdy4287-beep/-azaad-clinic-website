from pathlib import Path
import subprocess

STEPS = [
    ["python3", "qa/inject-central-i18n.py"],
    ["python3", "qa/inject-responsive-shell.py"],
    ["python3", ".github/patch-admin.py"],
    ["python3", "qa/inject-media-editor.py"],
    ["python3", ".github/finalize-auth.py"],
    ["python3", "qa/remove-legacy-admin-i18n-runtime.py"],
    ["python3", "qa/fix-production-contracts.py"],
    ["python3", ".github/inject-patient-actions.py"],
    ["python3", ".github/inject-doctor-actions.py"],
    ["python3", "qa/lazy-admin-modules.py"],
    ["python3", "qa/inject-admin-early-recovery.py"],
    # Canonicalize Admin's external script graph after every injector has run.
    ["python3", "qa/dedupe-admin-scripts.py"],
    ["python3", "qa/canonicalize-public-booking-i18n.py"],
    ["python3", "qa/fix-public-language-edge-cases.py"],
    ["python3", "qa/final-public-i18n-owner.py"],
    ["python3", "qa/admin-i18n-single-owner-gate.py"],
]

for command in STEPS:
    path = Path(command[1])
    if not path.is_file():
        raise SystemExit(f"Missing required production build step: {path}")
    print(f"[AZAAD build] {' '.join(command)}", flush=True)
    subprocess.run(command, check=True)

final_i18n = ["python3", "qa/finalize-central-i18n.py"]
print(f"[AZAAD build] {' '.join(final_i18n)}", flush=True)
subprocess.run(final_i18n, check=True)

performance_guard = ["python3", "qa/inject-public-performance-guard.py"]
print(f"[AZAAD build] {' '.join(performance_guard)}", flush=True)
subprocess.run(performance_guard, check=True)

public_experience = ["python3", "qa/inject-public-experience-hardening.py"]
print(f"[AZAAD build] {' '.join(public_experience)}", flush=True)
subprocess.run(public_experience, check=True)

verify = ["python3", "qa/verify-production-contracts.py"]
print(f"[AZAAD build] {' '.join(verify)}", flush=True)
subprocess.run(verify, check=True)

print("[AZAAD build] production transformation pipeline completed", flush=True)
