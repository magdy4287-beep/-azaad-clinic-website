#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
enterprise_path = ROOT / "admin-enterprise-centers.js"
invoice_api = ROOT / "api" / "invoices.js"
legacy_loader = ROOT / "rcm-finance-loader.js"
legacy_renderer = ROOT / "rcm-finance-center.js"

if not enterprise_path.is_file():
    raise SystemExit("RCM contract gate failed: canonical Enterprise Admin owner is missing")
if not invoice_api.is_file():
    raise SystemExit("RCM contract gate failed: canonical invoice API boundary is missing")

enterprise = enterprise_path.read_text(encoding="utf-8")
api = invoice_api.read_text(encoding="utf-8")
checks = {
    "enterprise RCM owner": "if(key==='rcm')" in enterprise,
    "canonical invoice backend boundary": "'/api/invoices?limit=200'" in enterprise,
    "authenticated cookie-backed backend call": "credentials: 'include'" in enterprise and "cache: 'no-store'" in enterprise,
    "RCM summary is rendered from backend response": "const s=d.summary||{}" in enterprise and "s.count" in enterprise,
    "invoice API is Appwrite-Neon": "provider: 'appwrite-neon'" in api,
    "invoice API reads canonical Neon invoice tables": "public.clinic_invoices" in api and "public.clinic_payments" in api,
    "invoice API enforces RCM roles": "OWNER', 'ADMIN', 'MANAGER', 'CASHIER" in api,
    "legacy global RCM loader removed": not legacy_loader.exists(),
    "legacy duplicate RCM renderer removed": not legacy_renderer.exists(),
    "no Supabase runtime in canonical RCM owner": "supabase" not in enterprise.lower(),
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
if failed:
    raise SystemExit(f"RCM contract gate failed: {', '.join(failed)}")
print("RCM contract gate: PASS")
