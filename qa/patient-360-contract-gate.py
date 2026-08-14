#!/usr/bin/env python3
"""Azaad Clinic Patient 360 contract gate.

Free-first static acceptance checks for the production Patient Center contract.
This gate does not create or mutate patient data and does not replace E2E tests.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PATIENTS = ROOT / "patients-center.js"
ADMIN = ROOT / "admin.html"

errors = []

def require(path: Path, needle: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    if needle not in text:
        errors.append(f"MISSING: {label} -> {path}")

if not PATIENTS.exists():
    errors.append(f"MISSING FILE: {PATIENTS}")
else:
    text = PATIENTS.read_text(encoding="utf-8")
    checks = [
        ("canonical AZA-###### normalization", r"AZA-\\d\{6\}"),
        ("five-digit Patient display", r"Patient \\$\{normalized\.slice\(4\)\}"),
        ("numeric search normalization", r"v\.padStart\(6,'0'\)"),
        ("patient search supports booking number", "p.booking_code"),
        ("appointment date filter", "bookingDateFilter"),
        ("appointment search", "bookingSearch"),
        ("appointment API", "azaad-appointments-center"),
        ("patient API", "azaad-patients"),
        ("English translation helper", "const tr = (ar, en) => isEnglish() ? en : ar"),
        ("Patient 360 entry point", "open360"),
        ("follow-up/clinical data contract", "followups"),
        ("invoice data contract", "invoices"),
    ]
    for label, needle in checks:
        if re.search(needle, text) is None:
            errors.append(f"MISSING: {label}")

if not ADMIN.exists():
    errors.append(f"MISSING FILE: {ADMIN}")
else:
    text = ADMIN.read_text(encoding="utf-8")
    for label, needle in [
        ("Patients panel integration", "patients-center.js"),
        ("Admin page", 'id="adminPage"'),
    ]:
        if needle not in text:
            errors.append(f"MISSING: {label}")

if errors:
    print("PATIENT 360 CONTRACT GATE: FAIL")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("PATIENT 360 CONTRACT GATE: PASS")
print("- Canonical MRN remains AZA-######")
print("- Display contract is Patient #####")
print("- Search accepts numeric patient number")
print("- Appointment date/search contracts are present")
print("- Patient/appointment APIs are wired")
print("- English translation helper is present")
print("- Patient 360, follow-up and invoice contracts are present")
print("- No patient data was created or modified")
