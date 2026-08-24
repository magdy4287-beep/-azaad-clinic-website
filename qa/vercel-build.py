from pathlib import Path
import subprocess

# Canonical production artifact owner. Every mutating step belongs here.
# The Admin runtime canonicalizer intentionally runs LAST so no earlier
# compatibility/injection transform can reintroduce a competing inline owner.
TRANSFORM_STEPS = [
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
    ["python3", "qa/fix-public-language-edge-cases.py"],
    ["python3", "qa/final-public-i18n-owner.py"],
    ["python3", "qa/admin-i18n-single-owner-gate.py"],
    ["python3", "qa/finalize-central-i18n.py"],
    ["python3", "qa/inject-public-performance-guard.py"],
    ["python3", "qa/inject-public-experience-hardening.py"],
    ["python3", "qa/canonicalize-admin-runtime.py"],
]

# Verification is strictly read-only. It may inspect and fail, but must never
# mutate the production artifact or conceal the owner of a regression.
VERIFY_STEPS = [
    ["python3", "qa/verify-admin-script-graph.py"],
    ["python3", "qa/repository-architecture-gate.py"],
    ["python3", "qa/verify-production-contracts.py"],
]


def run_steps(steps, phase):
    for command in steps:
        path = Path(command[1])
        if not path.is_file():
            raise SystemExit(f"Missing required production {phase} step: {path}")
        print(f"[AZAAD build:{phase}] {' '.join(command)}", flush=True)
        subprocess.run(command, check=True)


run_steps(TRANSFORM_STEPS, "transform")
run_steps(VERIFY_STEPS, "verify")
print("[AZAAD build] canonical production transformation + read-only verification completed", flush=True)
