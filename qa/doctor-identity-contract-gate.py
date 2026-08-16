#!/usr/bin/env python3
"""Structural acceptance gate for doctor/staff identity integrity."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
migration = (ROOT / "supabase/migrations/20260816_harden_doctor_staff_identity_mapping.sql").read_text(encoding="utf-8")

checks = {
    "active doctor uniqueness": "clinic_staff_active_doctor_unique" in migration,
    "doctor foreign key": "clinic_staff_doctor_fk" in migration,
    "safe doctor deletion": "on delete set null" in migration.lower(),
    "doctor update propagation": "on update cascade" in migration.lower(),
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit("Doctor identity contract gate failed: " + ", ".join(failed))
print(f"Doctor identity contract gate passed: {len(checks)}/{len(checks)}")
