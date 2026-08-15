#!/usr/bin/env python3
"""Structural acceptance gate for Azaad Clinic central Waiting List."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

ui = read("waiting-list-center.js")
patch = read(".github/patch-admin.py")

checks = {
    "waiting list table referenced": "clinic_waiting_list" in ui,
    "patient identity": "patient_id" in ui,
    "doctor identity": "doctor_id" in ui,
    "MRN search": "mrn" in ui,
    "phone search": "patient_phone" in ui,
    "priority": "priority" in ui,
    "waiting status": "pending" in ui and "contacted" in ui and "cancelled" in ui,
    "ordered position": "position" in ui,
    "date filter": "requested_date" in ui,
    "RLS-backed write": ".insert(payload)" in ui and ".update(patch)" in ui,
    "no browser-side appointment creation": "from('clinic_bookings').insert" not in ui,
    "runtime injection": '"waiting-list-center.js"' in patch,
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit("Waiting List contract gate failed: " + ", ".join(failed))
print(f"Waiting List contract gate passed: {len(checks)}/{len(checks)}")
