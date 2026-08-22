#!/usr/bin/env bash
set -euo pipefail

# Provider-neutral, synthetic-only contract check.
# This validates the shape and safety properties of the DR fixture without
# connecting to Supabase, Production, or any external provider.

fixture="${1:-qa/fixtures/azaad-dr-synthetic-export.json}"

[[ -f "$fixture" ]] || { echo "FAIL-CLOSED: fixture not found" >&2; exit 1; }

python3 - "$fixture" <<'PY'
import json
import re
import sys

path = sys.argv[1]
with open(path, encoding="utf-8") as fh:
    data = json.load(fh)

if data.get("fixture") != "synthetic-only":
    raise SystemExit("FAIL-CLOSED: fixture must be explicitly synthetic-only")

raw = json.dumps(data, ensure_ascii=False)
for forbidden in ("service_role", "access_token", "password", "secret", "api_key"):
    if re.search(rf"\b{re.escape(forbidden)}\b", raw, re.I):
        raise SystemExit(f"FAIL-CLOSED: forbidden credential field detected: {forbidden}")

required = ("format_version", "fixture", "patients", "appointments", "visits", "invoices", "audit_events")
missing = [key for key in required if key not in data]
if missing:
    raise SystemExit(f"FAIL-CLOSED: missing required datasets/metadata: {missing}")

patient_ids = {row["patient_id"] for row in data["patients"]}
appointment_ids = {row["appointment_id"] for row in data["appointments"]}
visit_ids = {row["visit_id"] for row in data["visits"]}

if len(patient_ids) != len(data["patients"]):
    raise SystemExit("FAIL-CLOSED: duplicate logical patient ID")
if len(appointment_ids) != len(data["appointments"]):
    raise SystemExit("FAIL-CLOSED: duplicate logical appointment ID")
if len(visit_ids) != len(data["visits"]):
    raise SystemExit("FAIL-CLOSED: duplicate logical visit ID")

for row in data["appointments"]:
    if row["patient_id"] not in patient_ids:
        raise SystemExit("FAIL-CLOSED: broken appointment -> patient relationship")
for row in data["visits"]:
    if row["patient_id"] not in patient_ids or row["appointment_id"] not in appointment_ids:
        raise SystemExit("FAIL-CLOSED: broken visit relationship")
for row in data["invoices"]:
    if row["patient_id"] not in patient_ids:
        raise SystemExit("FAIL-CLOSED: broken invoice -> patient relationship")
for row in data["audit_events"]:
    if row["entity_id"] not in visit_ids:
        raise SystemExit("FAIL-CLOSED: broken audit -> entity relationship")

print("PASS: portable DR contract structure")
print("PASS: synthetic-only fixture")
print("PASS: no credential-like fields")
print("PASS: logical IDs and relationships are reconstructable")
PY
