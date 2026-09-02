from pathlib import Path
import os
import subprocess

TRANSFORM_STEPS = [
    ["python3", "qa/inject-central-i18n.py"],
    ["python3", "qa/fix-public-booking-central-i18n.py"],
    ["python3", "qa/inject-responsive-shell.py"],
    ["python3", "qa/inject-canonical-cairo-date.py"],
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
    ["python3", "qa/harden-admin-refresh-session.py"],
    ["python3", "qa/harden-admin-inline-refresh-session.py"],
    ["python3", "qa/finalize-admin-operational-data.py"],
    ["python3", "qa/finalize-admin-logout-ui.py"],
    ["python3", "qa/bump-public-language-bridge.py"],
    ["python3", "qa/finalize-admin-runtime-manifest.py"],
    ["python3", "qa/restore-canonical-admin-controller.py"],
    ["python3", "qa/finalize-admin-navigation-ownership.py"],
    ["python3", "qa/finalize-appwrite-admin-auth.py"],
]

VERIFY_STEPS = [
    ["python3", "qa/dedupe-admin-scripts.py"],
    ["python3", "qa/admin-panel-ownership-contract.py"],
    ["python3", "qa/admin-backend-boundary-gate.py"],
    ["python3", "qa/admin-domain-ownership-matrix.py"],
    ["python3", "qa/workflow-ownership-gate.py"],
    ["python3", "qa/verify-admin-script-graph.py"],
    ["python3", "qa/cairo-business-date-gate.py"],
    ["python3", "qa/repository-architecture-gate.py"],
    ["python3", "qa/verify-production-contracts.py"],
    ["python3", "qa/verify-admin-post-auth-interactivity.py"],
    ["python3", "qa/verify-admin-auth-critical-path.py"],
    ["python3", "qa/appwrite-admin-auth-boundary-gate.py"],
    ["python3", "qa/public-booking-central-i18n-gate.py"],
]

if [step[1] for step in TRANSFORM_STEPS].count("qa/finalize-admin-operational-data.py") != 1:
    raise SystemExit("Canonical operational-data boundary transform must exist exactly once")
if [step[1] for step in TRANSFORM_STEPS].count("qa/finalize-admin-navigation-ownership.py") != 1:
    raise SystemExit("Canonical navigation ownership transform must exist exactly once")
if [step[1] for step in TRANSFORM_STEPS].count("qa/finalize-appwrite-admin-auth.py") != 1:
    raise SystemExit("Canonical Appwrite Admin auth transform must exist exactly once")
if [step[1] for step in VERIFY_STEPS].count("qa/appwrite-admin-auth-boundary-gate.py") != 1:
    raise SystemExit("Appwrite Admin auth boundary gate must exist exactly once")


def run_steps(steps, phase):
    for command in steps:
        path = Path(command[1])
        if not path.is_file():
            raise SystemExit(f"Missing required production {phase} step: {path}")
        print(f"[AZAAD build:{phase}] {' '.join(command)}", flush=True)
        subprocess.run(command, check=True)

run_steps(TRANSFORM_STEPS, "transform")
run_steps(VERIFY_STEPS, "verify")

commit_sha = (os.environ.get("VERCEL_GIT_COMMIT_SHA") or os.environ.get("GITHUB_SHA") or "").strip()
if not commit_sha:
    raise SystemExit("Missing canonical build commit SHA")

admin = Path("admin.html")
text = admin.read_text(encoding="utf-8")
import re
text = re.sub(r'<meta\s+name=["\']azaad-build-sha["\'][^>]*>\s*\n?', '', text, flags=re.I)
head = text.find("</head>")
if head < 0:
    raise SystemExit("admin.html has no </head> for build provenance marker")
text = text[:head] + f'<meta name="azaad-build-sha" content="{commit_sha}">\n' + text[head:]
admin.write_text(text, encoding="utf-8")
print(f"[AZAAD build] production artifact provenance SHA = {commit_sha}", flush=True)
print("[AZAAD build] canonical production transformation + fail-closed verification completed", flush=True)
