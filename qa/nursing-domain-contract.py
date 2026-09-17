#!/usr/bin/env python3
"""Static contract for the canonical Nursing domain.
Fails closed on missing ownership, Supabase runtime, or missing safety boundaries.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

schema = ROOT / "migrations/20260916_nursing_domain.sql"
api = ROOT / "api/nursing.js"

required_schema = [
    "clinic_nursing_assignments",
    "clinic_nursing_observations",
    "clinic_nursing_assessments",
    "clinic_nursing_care_plans",
    "clinic_nursing_handoffs",
    "clinic_nursing_tasks",
    "clinic_nursing_events",
]
required_api = [
    "APPWRITE_ENDPOINT",
    "APPWRITE_PROJECT_ID",
    "azaad_admin_appwrite_session",
    "CLINICAL_ROLES",
    "NURSE",
    "clinic_nursing_assignments",
    "clinic_nursing_observations",
    "clinic_nursing_assessments",
    "clinic_nursing_care_plans",
    "clinic_nursing_handoffs",
    "clinic_nursing_tasks",
    "clinic_nursing_events",
    "audit",
]

for path in (schema, api):
    if not path.exists():
        raise SystemExit(f"FAIL: missing {path.relative_to(ROOT)}")

schema_text = schema.read_text(encoding="utf-8")
api_text = api.read_text(encoding="utf-8")

for token in required_schema:
    if token not in schema_text:
        raise SystemExit(f"FAIL: missing schema token {token}")
for token in required_api:
    if token not in api_text:
        raise SystemExit(f"FAIL: missing API token {token}")

for forbidden in ("supabase", "createClient", "VITE_SUPABASE"):
    if forbidden.lower() in api_text.lower():
        raise SystemExit(f"FAIL: retired provider residue in nursing API: {forbidden}")

if "CLINICAL_ROLES" not in api_text or "NURSE" not in api_text:
    raise SystemExit("FAIL: NURSE is not a canonical nursing authorization role")

if "WRITE_ROLES" not in api_text or "NURSE" not in api_text:
    raise SystemExit("FAIL: nursing write boundary is not explicitly role-scoped")

if "audit(sql" not in api_text:
    raise SystemExit("FAIL: nursing writes do not expose an audit boundary")

print("PASS: canonical Nursing domain contract")
