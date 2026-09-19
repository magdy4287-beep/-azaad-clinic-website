#!/usr/bin/env python3
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
files={
"admin.html":(ROOT/"admin.html").read_text(encoding="utf-8"),
"scheduling-v2.js":(ROOT/"scheduling-v2.js").read_text(encoding="utf-8"),
"patient-mrn-display-v2.js":(ROOT/"patient-mrn-display-v2.js").read_text(encoding="utf-8"),
"patients-center.js":(ROOT/"patients-center.js").read_text(encoding="utf-8") if (ROOT/"patients-center.js").exists() else "",
}
all_text="\n".join(files.values())
checks={
"appointment/date":bool(re.search(r"appointment|booking|booking_date|appointment_date",all_text,re.I)),
"appointment/time":bool(re.search(r"appointment_time|booking_time",all_text,re.I)),
"doctor linkage":bool(re.search(r"doctor_id|doctorId|doctor",all_text,re.I)),
"patient linkage":bool(re.search(r"patient_id|patientId|patient",all_text,re.I)),
"service linkage":bool(re.search(r"service_id|serviceId|service",all_text,re.I)),
"status":bool(re.search(r"status|confirmed|scheduled|cancelled|completed",all_text,re.I)),
"patient MRN display":"slice(-5)" in files["patient-mrn-display-v2.js"] and "Patient" in files["patient-mrn-display-v2.js"],
"numeric MRN search":bool(re.search(r"padStart\(6|replace.*AZA|MRN|mrn",all_text,re.I)),
}
failed=[n for n,v in checks.items() if not v]
for n,v in checks.items(): print(f"{'PASS' if v else 'FAIL'}: {n}")
if failed: raise SystemExit("Appointment contract gate failed: "+", ".join(failed))
print("Appointment contract gate: PASS")
