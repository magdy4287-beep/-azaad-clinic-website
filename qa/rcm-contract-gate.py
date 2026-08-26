#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
enterprise_path = ROOT / "admin-enterprise-centers.js"
legacy_loader = ROOT / "rcm-finance-loader.js"
legacy_renderer = ROOT / "rcm-finance-center.js"

if not enterprise_path.is_file():
    raise SystemExit("RCM contract gate failed: canonical Enterprise Admin owner is missing")

enterprise = enterprise_path.read_text(encoding="utf-8")

checks = {
    "enterprise RCM owner": "if(key==='rcm')" in enterprise and "azaad-invoice-center?api=invoices" in enterprise,
    "invoice total contract": bool(re.search(r"total_amount|total", enterprise, re.I)),
    "payment contract": "clinic_payments" in enterprise or "azaad-invoice-center" in enterprise,
    "outstanding balance": "remaining_amount" in enterprise,
    "patient linkage": "clinic_patients" in enterprise or "patient" in enterprise.lower(),
    "booking linkage": "clinic_bookings" in enterprise or "booking" in enterprise.lower(),
    "invoice status": "status" in enterprise,
    "MRN/search linkage": "mrn" in enterprise.lower(),
    "reporting dates": "from" in enterprise and "to" in enterprise,
    "E2E operational boundary": "azaad-invoice-center?api=invoices" in enterprise,
    "legacy global RCM loader removed": not legacy_loader.exists(),
    "legacy duplicate RCM renderer removed": not legacy_renderer.exists(),
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit(f"RCM contract gate failed: {', '.join(failed)}")

print("RCM contract gate: PASS")
