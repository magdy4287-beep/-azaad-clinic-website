#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(path: str, tokens: list[str]) -> None:
    p = ROOT / path
    if not p.exists():
        raise SystemExit(f"missing scheduling artifact: {path}")
    text = p.read_text(encoding="utf-8")
    for token in tokens:
        if token not in text:
            raise SystemExit(f"{path}: missing required token: {token}")


# Phase 4 must have one canonical, side-effect-free scheduling model.
require("central-scheduling-contract.js", [
    "STATUS", "AVAILABLE", "CONFIRMED", "PENDING", "NO_SHOW", "CANCELLED", "CLOSED",
    "validateSlot", "canDoctorViewSlot", "normalizeStatus", "toDateKey",
])

require("central-scheduling-center.js", [
    "buildSlot", "groupByDoctor", "sortSlots",
])

# Scheduling mutations remain behind an explicit action/authorization boundary.
require("scheduling-actions-contract.js", [
    "BOOK", "RESCHEDULE", "CANCEL", "NO_SHOW", "TRANSFER", "ASSIGN_WAITING",
    "canRoleAct", "canDoctorAct", "validatePatientIdentity", "validateSlot",
    "validateTransition", "validateAction",
])

# Existing dedicated scheduling/booking/waiting-list gates must remain present.
for workflow in [
    ".github/workflows/central-scheduling-gate.yml",
    ".github/workflows/scheduling-actions-gate.yml",
    ".github/workflows/azaad-appointment-gate.yml",
    ".github/workflows/azaad-waiting-list-gate.yml",
]:
    if not (ROOT / workflow).exists():
        raise SystemExit(f"missing required scheduling workflow: {workflow}")

# The scheduling center is a read/compose layer; mutation boundary must stay backend-owned.
center = (ROOT / "central-scheduling-center.js").read_text(encoding="utf-8")
if "supabase" in center.lower() or ".insert(" in center or ".update(" in center or ".delete(" in center:
    raise SystemExit("central scheduling center must remain side-effect free")

# Doctor scope must be explicit in the canonical scheduling contract.
contract = (ROOT / "central-scheduling-contract.js").read_text(encoding="utf-8")
if "String(authenticatedDoctorId)===String(slot.doctor_id)" not in contract:
    raise SystemExit("doctor scheduling scope invariant missing")

print("Azaad Phase 4 Scheduling Gate: PASS")
