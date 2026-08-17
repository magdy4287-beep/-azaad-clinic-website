#!/usr/bin/env python3
"""AZAAD Phase 5 — Check-in contract gate.

Static gate for the server-side check-in boundary. It intentionally does not
modify patient, clinical, payment, or refund data.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Discover likely implementation files without assuming a single frontend layout.
text = "\n".join(
    p.read_text(errors="ignore")
    for p in ROOT.rglob("*")
    if p.is_file() and p.suffix in {".js", ".ts", ".tsx", ".sql"}
    and "node_modules" not in p.parts
    and ".git" not in p.parts
)

required = {
    "server-side booking lock": "for update" in text.lower(),
    "check-in timestamp": "checked_in_at" in text,
    "check-in actor": "checked_in_by" in text,
    "late arrival state": "checked_in_late" in text,
    "duplicate check-in rejection": "INVALID_CHECKIN_STATUS" in text,
    "cancelled booking rejection": "BOOKING_CANCELLED" in text,
    "audit trail": "booking_checkin" in text,
    "frontdesk authorization": "FRONTDESK_NOT_AUTHORIZED" in text,
    "clinical visit requires checked-in state": "booking_not_ready_for_visit" in text,
    "server-side doctor scope": "doctor_scope_denied" in text,
}

failed = [name for name, ok in required.items() if not ok]
for name, ok in required.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit("Phase 5 Check-in Gate failed: " + ", ".join(failed))

print("Phase 5 Check-in contract gate: PASS")
