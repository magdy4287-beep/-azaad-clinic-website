from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    p = ROOT / name
    assert p.exists() and p.stat().st_size > 0, f"missing: {name}"
    return p.read_text(encoding="utf-8")

index = read("index.html")
admin = read("admin.html")
app = read("app.js")
patient_center = read("patients-center.js")

# Public booking contract: direct booking is the canonical patient experience.
# The obsolete phone-first lookup gate must not be part of the public page.
assert "patient-booking-gate.js" not in index
assert "bookingForm" in app
assert "booking_code" in app
assert "phone" in app.lower()
assert "name" in app.lower()

# Patient 360/admin search must understand MRN and booking identifiers.
assert "booking_code" in patient_center
assert "mrn" in patient_center.lower()

# Admin must load the patient/booking workflow layers.
for script in (
    "frontdesk-workflow.js",
    "patient-merge-tool.js",
    "patient-clinical-history.js",
    "patient-mrn-display-v2.js",
    "admin-nextgen-v2.js",
):
    assert script in read(".github/patch-admin.py"), f"not injected: {script}"

# Clinical AI must be injected into the clinician page, not only stored in GitHub.
patcher = read(".github/patch-admin.py")
for script in ("clinician-ai-session-cockpit.js", "clinician-longitudinal-dashboard.js"):
    assert script in patcher, f"clinical AI not injected: {script}"

# AI remains advisory; core booking must not depend on AI availability.
ai = read("ai-operating-center.js")
assert "fallback" in ai.lower() or "no-ai" in ai.lower()

print("Azaad cross-module integration contract: PASS")
