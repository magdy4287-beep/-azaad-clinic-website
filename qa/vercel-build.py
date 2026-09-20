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
        try:
            subprocess.run(c,check=True)
        except subprocess.CalledProcessError as exc:
            raise SystemExit(
                f"FIRST REAL BUILD VERIFIER FAILURE: phase={phase} script={c[1]} "
                f"exit_code={exc.returncode}"
            ) from exc

if TRANSFORM_STEPS:
    raise SystemExit("FAIL-CLOSED: production source transforms must be materialized in Git, not executed by Vercel")

run(VERIFY_STEPS,'verify')
sha=(os.environ.get('GITHUB_SHA') or os.environ.get('VERCEL_GIT_COMMIT_SHA') or '').strip()
admin=Path('admin.html')
text=admin.read_text(encoding='utf-8')
import re
text=re.sub(r"<meta\\s+name=[\"']azaad-build-sha[\"'][^>]*>\\s*\\n?",'',text,flags=re.I)
head=text.find('</head>')
if head<0:
    raise SystemExit('admin.html has no </head> for build provenance marker')
admin.write_text(text[:head]+f'<meta name="azaad-build-sha" content="{sha}">\n'+text[head:],encoding='utf-8')
if not sha:
    raise SystemExit('Missing canonical build commit SHA')
print(f'[AZAAD build] production artifact provenance SHA = {sha}',flush=True)
print('[AZAAD build] immutable canonical source + fail-closed verification completed',flush=True)
