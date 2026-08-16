#!/usr/bin/env python3
"""Structural acceptance gate for doctor/staff identity integrity."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
base = (ROOT / "supabase/migrations/20260816_harden_doctor_staff_identity_mapping.sql").read_text(encoding="utf-8")
contract = (ROOT / "supabase/migrations/20260816_enforce_doctor_staff_binding.sql").read_text(encoding="utf-8")
binding = (ROOT / "doctor-staff-binding.js").read_text(encoding="utf-8")

checks = {
    "active doctor uniqueness": "clinic_staff_active_doctor_unique" in base,
    "doctor foreign key": "clinic_staff_doctor_fk" in base,
    "safe doctor deletion": "on delete set null" in base.lower(),
    "doctor update propagation": "on update cascade" in base.lower(),
    "doctor role requires binding": "role = 'DOCTOR' and doctor_id is not null" in contract,
    "non-doctor cannot carry binding": "role <> 'DOCTOR' and doctor_id is null" in contract,
    "binding UI uses staff-admin": "staff-admin" in binding,
    "binding UI sends doctor_id": "doctor_id:doctorId" in binding,
    "binding UI does not create doctors": "لا يتم إنشاء طبيب جديد" in binding,
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit("Doctor identity contract gate failed: " + ", ".join(failed))
print(f"Doctor identity contract gate passed: {len(checks)}/{len(checks)}")
