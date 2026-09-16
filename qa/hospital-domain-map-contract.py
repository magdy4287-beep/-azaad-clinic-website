"""AZAAD hospital domain ownership contract.

This contract is intentionally structural: it prevents department proliferation
without canonical ownership. It does not claim clinical conformance.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "AZAAD_HOSPITAL_MASTER_DOMAIN_MAP.md"

REQUIRED = [
    "Patient Administration / Registration",
    "Emergency Department",
    "Outpatient / Clinics",
    "Inpatient / Wards",
    "Nursing",
    "ICU",
    "Operating Room",
    "Anesthesia / PACU",
    "Pharmacy",
    "Laboratory",
    "Radiology / Imaging",
    "Blood Bank",
    "Admissions / Discharge",
    "Insurance / Payer",
    "Prior Authorization",
    "RCM / Claims",
    "Cashier / Finance",
    "Medical Records / HIM",
    "Scheduling",
    "Referral / Transfer",
    "Quality & Patient Safety",
    "Infection Control",
    "Inventory / Supply",
    "Procurement",
    "Staff / Workforce",
    "Audit / Compliance",
    "Reporting / BI",
    "AI Safety / Operations",
]


def fail(message: str) -> None:
    print(f"HOSPITAL DOMAIN MAP: FAIL-CLOSED - {message}")
    raise SystemExit(1)

if not DOC.exists():
    fail("canonical hospital domain map is missing")

text = DOC.read_text(encoding="utf-8")
for domain in REQUIRED:
    if domain not in text:
        fail(f"required canonical domain missing: {domain}")

if "Supabase is retired" not in text:
    fail("retired-provider rule missing")

if "NURSE" not in text:
    fail("NURSE role missing from canonical map")

if "Browser/UI → Appwrite HttpOnly identity → Vercel domain API → Neon PostgreSQL" not in text:
    fail("canonical runtime boundary missing")

rows = re.findall(r"^\| ([^|]+) \|", text, flags=re.MULTILINE)
seen = set()
for row in rows:
    name = row.strip()
    if name in seen:
        fail(f"duplicate domain ownership row: {name}")
    seen.add(name)

print(f"HOSPITAL DOMAIN MAP: PASS - {len(REQUIRED)} canonical domains present; no duplicate ownership rows")
