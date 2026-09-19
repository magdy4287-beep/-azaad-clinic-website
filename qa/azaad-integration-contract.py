from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(name):
 p=ROOT/name
 assert p.exists() and p.stat().st_size>0,f"missing: {name}"
 return p.read_text(encoding="utf-8")
index=read("index.html"); app=read("app.js"); patient_center=read("patients-center.js")
assert "patient-booking-gate.js" not in index
assert "bookingForm" in app and "booking_code" in app and "phone" in app.lower() and "name" in app.lower()
assert "/api/admin-appointments?api=patients" in patient_center
assert "/api/admin-appointments?api=patient&id=" in patient_center
assert "mrn" in patient_center.lower()
patcher=read(".github/patch-admin.py"); lazy=read("qa/lazy-admin-modules.py")
for script in ("patient-merge-tool.js","patient-clinical-history.js"):
 assert script in lazy and "LEGACY_OR_CONTRACT" in lazy,f"retired module not classified: {script}"
assert "patient-financial-summary.js" in patcher and "patient-financial-summary.js" in lazy
for script in ("clinician-ai-session-cockpit.js","clinician-longitudinal-dashboard.js"):
 assert script in patcher,f"clinical AI not injected: {script}"
ai=read("ai-operating-center.js")
assert "fallback" in ai.lower() or "no-ai" in ai.lower()
print("Azaad cross-module integration contract: PASS")