from pathlib import Path
import subprocess

TRANSFORM_STEPS = [
    ["python3", "qa/inject-central-i18n.py"],
    ["python3", "qa/fix-public-booking-central-i18n.py"],
    ["python3", "qa/inject-responsive-shell.py"],
    ["python3", ".github/patch-admin.py"],
    ["python3", "qa/inject-media-editor.py"],
    ["python3", ".github/finalize-auth.py"],
    ["python3", "qa/remove-legacy-admin-i18n-runtime.py"],
    ["python3", "qa/fix-production-contracts.py"],
    ["python3", ".github/inject-patient-actions.py"],
    ["python3", ".github/inject-doctor-actions.py"],
    ["python3", "qa/lazy-admin-modules.py"],
    ["python3", "qa/finalize-enterprise-admin.py"],
    ["python3", "qa/final-public-i18n-owner.py"],
    ["python3", "qa/admin-i18n-single-owner-gate.py"],
    ["python3", "qa/finalize-central-i18n.py"],
    ["python3", "qa/inject-public-performance-guard.py"],
    ["python3", "qa/inject-public-experience-hardening.py"],
    ["python3", "qa/fix-public-language-render-cycle.py"],
    ["python3", "qa/inject-doctor-services-admin.py"],
    ["python3", "qa/canonicalize-admin-runtime.py"],
    ["python3", "qa/isolate-admin-login-runtime.py"],
    ["python3", "qa/finalize-doctor-services-admin.py"],
    ["python3", "qa/fix-admin-runtime-syntax.py"],
    ["python3", "qa/fix-admin-post-auth-freeze.py"],
    ["python3", "qa/finalize-admin-critical-path.py"],
    ["python3", "qa/final-admin-interaction-safety.py"],
    ["python3", "qa/normalize-admin-login-form.py"],
    ["python3", "qa/final-admin-login-isolation.py"],
    ["python3", "qa/canonicalize-admin-interactivity-v2.py"],
    ["python3", "qa/finalize-admin-operational-data.py"],
    ["python3", "qa/finalize-admin-logout-ui.py"],
]

VERIFY_STEPS = [
    ["python3", "qa/verify-admin-script-graph.py"],
    ["python3", "qa/repository-architecture-gate.py"],
    ["python3", "qa/verify-production-contracts.py"],
    ["python3", "qa/verify-admin-post-auth-interactivity.py"],
    ["python3", "qa/verify-admin-auth-critical-path.py"],
    ["python3", "qa/public-booking-central-i18n-gate.py"],
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
