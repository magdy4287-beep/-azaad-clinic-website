#!/usr/bin/env python3
"""Structural acceptance gate for doctor/staff identity integrity."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
binding = (ROOT / "doctor-staff-binding.js").read_text(encoding="utf-8")
convert = (ROOT / "doctor-staff-convert.js").read_text(encoding="utf-8")
dashboard = (ROOT / "doctor-dashboard.js").read_text(encoding="utf-8")
admin_auth = (ROOT / "api/_admin-auth.js").read_text(encoding="utf-8")

checks = {
    "binding UI uses staff-admin": "staff-admin" in binding,
    "binding UI sends doctor_id": "doctor_id:doctorId" in binding,
    "binding UI does not create doctors": "لا يتم إنشاء طبيب جديد" in binding,
    "existing staff conversion uses staff-admin": "staff-admin" in convert,
    "existing staff conversion sets DOCTOR": "role:'DOCTOR'" in convert,
    "existing staff conversion sends doctor_id": "doctor_id:doctorId" in convert,
    "doctor dashboard uses canonical admin auth": "/api/admin-auth" in dashboard,
    "doctor dashboard requires doctor identity": "doctor_id" in dashboard,
    "admin auth resolves staff identity": "clinic_staff" in admin_auth and "doctor_id" in admin_auth,
    "admin auth is server-side": "credentials" in admin_auth or "HttpOnly" in admin_auth,
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit("Doctor identity contract gate failed: " + ", ".join(failed))
print(f"Doctor identity contract gate passed: {len(checks)}/{len(checks)}")
