#!/usr/bin/env python3
from pathlib import Path
root = Path(__file__).resolve().parents[1]
text = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in root.glob("*.js"))
required = ["patient_id", "booking_id", "clinic_invoices", "clinic_payments", "invoice_number", "verification_status"]
missing = [x for x in required if x not in text]
if missing:
    raise SystemExit("Missing Patient/RCM contract: " + ", ".join(missing))
print("PASS: Patient 360 -> Booking -> Invoice -> Payment -> RCM contract")
