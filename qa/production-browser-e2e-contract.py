#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
workflow = ROOT / ".github/workflows/azaad-production-certification-gate.yml"
text = workflow.read_text(encoding="utf-8")
required = [
    'workflow_run:',
    'workflows: ["Azaad Production Browser E2E"]',
    "github.event.workflow_run.conclusion == 'success'",
    'github.event.workflow_run.head_sha',
    'ref: ${{ github.event.workflow_run.head_sha }}',
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit("Production certification contract missing: " + ", ".join(missing))
print("Production browser certification contract: PASS")
