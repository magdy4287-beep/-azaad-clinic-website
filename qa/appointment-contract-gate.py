#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

files = {
    "admin.html": (ROOT / "admin.html").read_text(encoding="utf-8"),
    "admin-enhancements-v1.js": (ROOT / "admin-enhancements-v1.js").read_text(encoding="utf-8"),
    "patients-center.js": (ROOT / "patients-center.js").read_text(encoding="utf-8") if (ROOT / "patients-center.js").exists() else "",
}

all_text = "\n".join(files.values())
checks = {
    "appointment/date": bool(re.search(r"appointment|booking|booking_date|appointment_date", all_text, re.I)),
    "appointment/time": bool(re.search(r"start_time|end_time|appointment_time|booking_time", all_text, re.I)),
    "doctor linkage": bool(re.search(r"doctor_id|doctorId|doctor", all_text, re.I)),
    "patient linkage": bool(re.search(r"patient_id|patientId|patient", all_text, re.I)),
    "service linkage": bool(re.search(r"service_id|serviceId|service", all_text, re.I)),
    "status": bool(re.search(r"status|confirmed|scheduled|cancelled|completed", all_text, re.I)),
    "patient MRN display": "Patient 00001" in all_text or bool(re.search(r"Patient\s+.*padStart\(5", all_text)),
    "numeric MRN search": bool(re.search(r"padStart\(5|replace.*AZA|MRN|mrn", all_text, re.I)),
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit(f"Appointment contract gate failed: {', '.join(failed)}")

print("Appointment contract gate: PASS")
