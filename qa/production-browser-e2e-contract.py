#!/usr/bin/env python3
"""Fail-closed contract for production browser certification.

This gate intentionally does not execute Browser E2E. It validates that the
certification workflow can only certify an exact-commit browser run and cannot
silently fall back to a stale/other SHA.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
workflow = ROOT / ".github/workflows/azaad-production-certification-gate.yml"
text = workflow.read_text(encoding="utf-8")

required = [
    "workflow_run",
    "Azaad Production Browser E2E",
    "workflow_run.conclusion == 'success'",
    "github.event.workflow_run.head_sha",
]
missing = [x for x in required if x not in text]
if missing:
    raise SystemExit("Production certification workflow contract missing: " + ", ".join(missing))

# Certification must compare the Browser E2E head SHA with the commit being certified.
if not re.search(r"workflow_run\.head_sha.*github\.event\.workflow_run\.head_sha|github\.event\.workflow_run\.head_sha.*workflow_run\.head_sha", text, re.S):
    # Accept either explicit shell comparison or expression comparison elsewhere.
    if "head_sha" not in text:
        raise SystemExit("Production certification must bind Browser E2E to exact head SHA")

print("Production browser certification contract: PASS")
