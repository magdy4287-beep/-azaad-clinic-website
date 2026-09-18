from pathlib import Path
import os
import subprocess

# Production source is canonical and already materialized in Git.
# Vercel must never rewrite tracked source during a build.
TRANSFORM_STEPS=[]
VERIFY_STEPS=[["python3",x] for x in ("qa/engineering-tree-garbage-collection-gate.py","qa/dedupe-admin-scripts.py","qa/admin-panel-ownership-contract.py","qa/admin-backend-boundary-gate.py","qa/admin-domain-ownership-matrix.py","qa/workflow-ownership-gate.py","qa/verify-admin-script-graph.py","qa/cairo-business-date-gate.py","qa/repository-architecture-gate.py","qa/api-javascript-syntax-gate.py","qa/verify-production-contracts.py","qa/verify-admin-post-auth-interactivity.py","qa/verify-admin-auth-critical-path.py","qa/verify-admin-staff-caller-boundary.py","qa/appwrite-admin-auth-boundary-gate.py","qa/public-booking-central-i18n-gate.py","qa/public-runtime-ownership-gate.py","qa/clinical-assessment-runtime-boundary-gate.py","qa/clinical-browser-runtime-boundary-gate.py","qa/canonical-runtime-drift-gate.py","qa/architecture-hygiene-gate.py","qa/zero-retired-provider-residue-gate.py")]

def run(steps,phase):
    for c in steps:
        if not Path(c[1]).is_file():
            raise SystemExit(f"Missing required production {phase} step: {c[1]}")
        print(f"[AZAAD build:{phase}] {' '.join(c)}",flush=True)
        subprocess.run(c,check=True)

if TRANSFORM_STEPS:
    raise SystemExit("FAIL-CLOSED: production source transforms must be materialized in Git, not executed by Vercel")

run(VERIFY_STEPS,'verify')
sha=(os.environ.get('VERCEL_GIT_COMMIT_SHA') or os.environ.get('GITHUB_SHA') or '').strip()
if not sha:
    raise SystemExit('Missing canonical build commit SHA')
print(f'[AZAAD build] production artifact provenance SHA = {sha}',flush=True)
print('[AZAAD build] immutable canonical source + fail-closed verification completed',flush=True)
