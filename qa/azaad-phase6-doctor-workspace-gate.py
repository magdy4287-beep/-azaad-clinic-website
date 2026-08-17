#!/usr/bin/env python3
"""AZAAD Phase 6 — Doctor Clinical Workspace contract gate.

Static/contract validation only. No patient, clinical, financial, or refund data
is mutated by this gate.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    p = ROOT / name
    if not p.exists():
        raise SystemExit(f"Missing required implementation file: {name}")
    return p.read_text(errors="ignore")

html = read("doctor-dashboard.html")
js = read("doctor-dashboard.js")

checks = {
    "doctor dashboard screen": "Doctor Clinical Workspace" in html,
    "doctor schedule": "My Schedule" in html and "scheduleDate" in html,
    "doctor patient list": "My Patients" in html,
    "patient search": "Patient Search" in html and "patientSearch" in html,
    "waiting list": "Waiting List" in html and "waitingList" in html,
    "patient workspace": "openWorkspace" in js and "patient_workspace" in js,
    "authenticated dashboard API": "Authorization:`Bearer ${session.access_token}`" in js,
    "server clinical visit boundary": "azaad-doctor-start-visit" in js,
    "assessment boundary": "azaad-clinical-assessments" in js,
    "clinical history boundary": "azaad-clinical-history" in js,
    "AI assist boundary": "azaad-doctor-ai" in js,
    "session start requires checked-in": "checked_in','checked_in_late" in js,
    "session start requires paid": "payment_status" in js and "paid" in js,
    "session end control": "endSessionBtn" in html and "in_progress" in js,
    "clinical notes": "clinicalNotes" in html and "saveVisitBtn" in html,
    "assessment UI": "assessmentTemplate" in html and "assessmentForm" in html,
    "patient progress": "patientProgress" in html,
    "follow-up date": "nextVisitDate" in html,
    "AI is assistive": "مساعد قرار سريري فقط" in html,
    # The implementation defines esc as an arrow-function constant, not a
    # function declaration. Validate the actual escaping helper shape.
    "HTML escaping": bool(re.search(r"(?:const|let|var)\s+esc\s*=", js)) and all(x in js for x in ["&amp;", "&lt;", "&gt;", "&quot;", "&#039;"]),
}

for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit("Phase 6 Doctor Clinical Workspace Gate failed: " + ", ".join(failed))

print("Phase 6 Doctor Clinical Workspace contract gate: PASS")
