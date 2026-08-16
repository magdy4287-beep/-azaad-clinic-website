from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
contract = ROOT / "scheduling-actions-contract.js"
text = contract.read_text(encoding="utf-8")

required = [
    "ACTION",
    "BOOK",
    "RESCHEDULE",
    "CANCEL",
    "NO_SHOW",
    "TRANSFER",
    "ASSIGN_WAITING",
    "canRoleAct",
    "canDoctorAct",
    "validatePatientIdentity",
    "validateSlot",
    "validateTransition",
    "validateAction",
    "doctor_scope_denied",
    "authentication_required",
]

missing = [item for item in required if item not in text]
if missing:
    raise SystemExit("Scheduling Actions contract missing: " + ", ".join(missing))

# Guardrails: this contract must remain side-effect free and must not become a DB client.
for forbidden in ("supabase.from(", "fetch(", "XMLHttpRequest", "localStorage.setItem"):
    if forbidden in text:
        raise SystemExit(f"Scheduling Actions contract must remain side-effect free: found {forbidden}")

print("Scheduling Actions V1 contract gate: PASS")
