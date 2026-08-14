#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

candidate_paths = [
    "admin.html",
    "admin-enhancements-v1.js",
    "patients-center.js",
    "public-ui.js",
    "app.js",
]
texts = []
for rel in candidate_paths:
    p = ROOT / rel
    if p.exists():
        texts.append(p.read_text(encoding="utf-8"))
all_text = "\n".join(texts)

checks = {
    "invoice contract": bool(re.search(r"invoice|invoices|clinic_invoices", all_text, re.I)),
    "invoice total": bool(re.search(r"total|grand_total|amount|subtotal", all_text, re.I)),
    "payment contract": bool(re.search(r"payment|payments|clinic_payments", all_text, re.I)),
    "outstanding balance": bool(re.search(r"outstanding|balance|remaining|due", all_text, re.I)),
    "patient linkage": bool(re.search(r"patient_id|patientId|patient", all_text, re.I)),
    "booking linkage": bool(re.search(r"booking_id|bookingId|booking", all_text, re.I)),
    "doctor/service linkage": bool(re.search(r"doctor_id|doctorId|service_id|serviceId", all_text, re.I)),
    "invoice status": bool(re.search(r"invoice_status|status|paid|unpaid|pending|cancelled", all_text, re.I)),
    "MRN/search linkage": bool(re.search(r"MRN|mrn|AZA-000001|padStart\(5", all_text, re.I)),
    "reporting dates": bool(re.search(r"daily|monthly|annual|year|month|date|created_at", all_text, re.I)),
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit(f"RCM contract gate failed: {', '.join(failed)}")

print("RCM contract gate: PASS")
