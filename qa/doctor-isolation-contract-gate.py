#!/usr/bin/env python3
"""Static contract gate for doctor-scoped authorization.

This gate intentionally does not manufacture production Doctor accounts.
It verifies that the repository keeps the required authorization invariants
in the database/backend contract before real A/B E2E credentials are used.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    p = ROOT / path
    if not p.exists():
        raise SystemExit(f"MISSING: {path}")
    return p.read_text(encoding="utf-8")

migration = read("supabase/migrations/20260816_enforce_doctor_staff_binding.sql")
identity = read("supabase/migrations/20260816_harden_doctor_staff_identity_mapping.sql")
dashboard = read("doctor-dashboard.js")

checks = {
    "doctor role requires doctor_id": "role = 'DOCTOR' and doctor_id is not null" in migration,
    "non-doctor cannot retain doctor_id": "role <> 'DOCTOR' and doctor_id is null" in migration,
    "active doctor binding is unique": "clinic_staff_active_doctor_unique" in identity,
    "staff doctor foreign key exists": "clinic_staff_doctor_fk" in identity,
    "dashboard requires access token": "session?.access_token" in dashboard,
    "dashboard calls scoped backend": "azaad-doctor-dashboard" in dashboard,
    "dashboard does not submit doctor_id": "doctor_id:" not in dashboard,
    "patient search is locally limited to scoped response": "cache.filter" in dashboard,
}

failed = []
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
    if not ok:
        failed.append(name)

if failed:
    raise SystemExit("Doctor isolation contract gate failed: " + ", ".join(failed))

print(f"Doctor isolation contract gate passed: {len(checks)}/{len(checks)}")
print("NOTE: Real Doctor A/B isolation remains an E2E credential test and must not be faked by this static gate.")
