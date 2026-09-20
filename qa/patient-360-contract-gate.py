#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]
patients=ROOT/"patients-center.js"; api=ROOT/"api/_admin-appointments.js"; finance=ROOT/"patient-financial-summary.js"; finance_api=ROOT/"api/_patient-financial-summary.js"
if not patients.exists(): errors.append("patients-center.js is missing")
else:
 t=patients.read_text(encoding="utf-8")
 for label,needle in {"canonical MRN normalization":"normalizePatientNumber","five-digit Patient display":"Patient ${n.slice(-5)}","patient search API":"api/admin-appointments?api=patients","Patient 360 API":"api/admin-appointments?api=patient&id=","English helper":"const tr = (ar,en) => isEnglish() ? en : ar","Patient 360 entry":"open360"}.items():
  if needle not in t: errors.append(f"{label} missing")
if not api.exists(): errors.append("canonical Patient 360 API is missing")
else:
 t=api.read_text(encoding="utf-8")
 for label,needle in {"booking contract":"booking_code","appointment date":"appointment_date","follow-up contract":"clinic_followups","invoice contract":"clinic_invoices","payment contract":"clinic_payments","clinical visit contract":"clinic_clinical_visits","alert contract":"clinic_alerts","server authorization":"clinic_staff","canonical provider":"appwrite-neon"}.items():
  if needle not in t: errors.append(f"{label} missing")
if not finance.exists(): errors.append("patient financial UI missing")
if not finance_api.exists(): errors.append("canonical patient financial API missing")
else:
 t=finance_api.read_text(encoding="utf-8")
 for label,needle in {"Neon boundary":"@neondatabase/serverless","invoice table":"public.clinic_invoices","payment table":"public.clinic_payments","Appwrite session":"azaad_admin_appwrite_session"}.items():
  if needle not in t: errors.append(f"{label} missing")
admin=ROOT/"admin.html"
if not admin.exists() or "patients-center.js" not in admin.read_text(encoding="utf-8"): errors.append("Admin Patient Center integration missing")
if errors:
 print("PATIENT 360 CONTRACT GATE: FAIL")
 for e in errors: print("-",e)
 raise SystemExit(1)
print("PATIENT 360 CONTRACT GATE: PASS")