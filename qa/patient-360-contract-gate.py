#!/usr/bin/env python3
"""Static Patient 360 acceptance contract. Never creates or mutates patient data."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PATIENTS = ROOT / "patients-center.js"
ADMIN = ROOT / "admin.html"
errors = []

if not PATIENTS.exists():
    errors.append("patients-center.js is missing")
else:
    text = PATIENTS.read_text(encoding="utf-8")
    required = {
        "canonical MRN normalization": "if (/^AZA-\\d{6}$/.test(v)) return v",
        "numeric patient normalization": "v.padStart(6,'0')",
        "five-digit Patient display": "`Patient ${normalized.slice(4)}`",
        "patient search booking number": "p.booking_code",
        "appointment date filter": "bookingDateFilter",
        "appointment search": "bookingSearch",
        "appointment API": "azaad-appointments-center",
        "patient API": "azaad-patients",
        "English helper": "const tr = (ar, en) => isEnglish() ? en : ar",
        "Patient 360 entry": "open360",
        "follow-up contract": "followups",
        "invoice contract": "invoices",
    }
    for label, needle in required.items():
        if needle not in text:
            errors.append(f"{label} missing")

if not ADMIN.exists():
    errors.append("admin.html is missing")
else:
    text = ADMIN.read_text(encoding="utf-8")
    for label, needle in {
        "admin page": 'id="adminPage"',
        "patients integration": "patients-center.js",
    }.items():
        if needle not in text:
            errors.append(f"{label} missing")

if errors:
    print("PATIENT 360 CONTRACT GATE: FAIL")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("PATIENT 360 CONTRACT GATE: PASS")
print("- AZA-###### remains canonical")
print("- Patient ##### is the display/search contract")
print("- Appointment date and search contracts are wired")
print("- Patient 360, follow-up and invoice contracts are present")
print("- No patient data was created or modified")
