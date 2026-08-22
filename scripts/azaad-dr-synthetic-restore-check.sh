#!/usr/bin/env bash
set -euo pipefail

# Deterministic, synthetic-only DR reconciliation gate.
# This never reads Production data and never accepts credentials.

fixture="${1:-qa/fixtures/azaad-dr-synthetic-export.json}"

if [[ ! -f "$fixture" ]]; then
  echo "FAIL-CLOSED: synthetic fixture not found: $fixture" >&2
  exit 1
fi

python3 - "$fixture" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path, encoding="utf-8") as fh:
    data = json.load(fh)

if data.get("fixture") != "synthetic-only":
    raise SystemExit("FAIL-CLOSED: fixture is not explicitly synthetic-only")

patients = {p["patient_id"] for p in data.get("patients", [])}
appointments = {a["appointment_id"] for a in data.get("appointments", [])}
visits = data.get("visits", [])
invoices = data.get("invoices", [])
audit_events = data.get("audit_events", [])

if len(patients) != len(data.get("patients", [])):
    raise SystemExit("FAIL-CLOSED: duplicate patient IDs")

for row in data.get("appointments", []):
    if row["patient_id"] not in patients:
        raise SystemExit("FAIL-CLOSED: appointment references unknown patient")

for row in visits:
    if row["patient_id"] not in patients or row["appointment_id"] not in appointments:
        raise SystemExit("FAIL-CLOSED: visit has broken relationship")

for row in invoices:
    if row["patient_id"] not in patients:
        raise SystemExit("FAIL-CLOSED: invoice references unknown patient")

visit_ids = {row["visit_id"] for row in visits}
for row in audit_events:
    if row["entity_id"] not in visit_ids:
        raise SystemExit("FAIL-CLOSED: audit event references unknown entity")

expected = {"patients": 2, "appointments": 2, "visits": 1, "invoices": 1, "audit_events": 1}
actual = {
    "patients": len(data.get("patients", [])),
    "appointments": len(data.get("appointments", [])),
    "visits": len(visits),
    "invoices": len(invoices),
    "audit_events": len(audit_events),
}

if actual != expected:
    raise SystemExit(f"FAIL-CLOSED: fixture counts differ: expected={expected} actual={actual}")

print("PASS: synthetic DR restore/reconciliation checks")
print("PASS: no Production data involved")
print(f"Counts: {actual}")
PY
