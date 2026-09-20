#!/usr/bin/env python3
"""Static contract gate for doctor-scoped authorization on canonical runtime surfaces."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def read(path):
    p=ROOT/path
    if not p.exists(): raise SystemExit(f"MISSING: {path}")
    return p.read_text(encoding="utf-8")
dashboard=read("doctor-dashboard.js")
auth=read("api/_admin-auth.js")
appts=read("api/_admin-appointments.js")
clinical=read("api/_clinical-assessments.js")
checks={
"dashboard hydrates through canonical auth":"/api/admin-auth" in dashboard,
"dashboard requires doctor identity":"doctor_id" in dashboard,
"dashboard filters appointments to authenticated doctor":"doctor_id" in dashboard and "appointments" in dashboard,
"dashboard opens only canonical clinical route":"/api/clinical-assessments" in dashboard,
"auth resolves staff doctor identity":"clinic_staff" in auth and "doctor_id" in auth,
"appointments enforce authenticated staff boundary":"clinic_staff" in appts,
"clinical API enforces authenticated staff boundary":"clinic_staff" in clinical,
"dashboard does not call retired external endpoints":"functions/v1/" not in dashboard,
}
failed=[n for n,v in checks.items() if not v]
for n,v in checks.items(): print(f"{'PASS' if v else 'FAIL'}: {n}")
if failed: raise SystemExit("Doctor isolation contract gate failed: "+", ".join(failed))
print(f"Doctor isolation contract gate passed: {len(checks)}/{len(checks)}")
print("NOTE: Real multi-account isolation remains an E2E credential test and is not faked here.")
