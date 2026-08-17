#!/usr/bin/env python3
"""AZAAD Phase 5 — Check-in source contract gate.

This gate validates the source-level boundary only. Live Supabase behavior is
verified separately against the deployed database and is never inferred from
frontend text. No patient, clinical, payment, or refund data is mutated.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
frontdesk = (ROOT / "supabase/functions/azaad-frontdesk-checkin/index.ts").read_text(errors="ignore")
visit = (ROOT / "supabase/functions/azaad-doctor-start-visit/index.ts").read_text(errors="ignore")
ui = (ROOT / "frontdesk-checkin-workflow.js").read_text(errors="ignore")

checks = {
    "frontdesk edge function exists": "clinic_frontdesk_checkin" in frontdesk,
    "frontdesk requires bearer auth": 'startsWith("Bearer ")' in frontdesk,
    "frontdesk resolves authenticated user": "auth.getUser" in frontdesk,
    "frontdesk accepts booking id": "p_booking_id" in frontdesk,
    "frontdesk UI requires session": "access_token" in ui,
    "frontdesk UI uses canonical RPC": "clinic_frontdesk_checkin" in ui,
    "doctor visit edge function exists": "clinic_start_clinical_visit" in visit,
    "doctor visit requires bearer auth": "startsWith('Bearer ')" in visit,
    "doctor visit resolves authenticated user": "auth.getUser" in visit,
    "doctor scope denial is surfaced": "doctor_scope_denied" in visit,
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit("Phase 5 Check-in source gate failed: " + ", ".join(failed))

print("Phase 5 Check-in source contract gate: PASS")
print("Live DB invariants must be verified separately; this gate does not claim them from source text.")
