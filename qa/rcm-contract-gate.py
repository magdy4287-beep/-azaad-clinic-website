#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

required = {
    "enterprise RCM owner": ROOT / "admin-enterprise-centers.js",
    "canonical invoice edge function source": ROOT / "supabase/functions/azaad-invoice-center/index.ts",
}
for name, path in required.items():
    if not path.is_file():
        raise SystemExit(f"RCM contract gate failed: missing {name}: {path}")

enterprise = (ROOT / "admin-enterprise-centers.js").read_text(encoding="utf-8")
edge = (ROOT / "supabase/functions/azaad-invoice-center/index.ts").read_text(encoding="utf-8")

checks = {
    "enterprise RCM owner": "if(key==='rcm')" in enterprise and "azaad-invoice-center?api=invoices" in enterprise,
    "invoice total contract": bool(re.search(r"total_amount|total", edge, re.I)),
    "payment contract": "clinic_payments" in edge,
    "outstanding balance": "remaining_amount" in edge,
    "patient linkage": "clinic_patients" in edge,
    "booking linkage": "clinic_bookings" in edge,
    "invoice status": "status" in edge,
    "MRN/search linkage": "normalizeMrn" in edge,
    "reporting dates": "created_at" in edge,
    "E2E operational boundary": "isE2E" in edge and "!isE2E(row)" in edge,
    "E2E direct invoice boundary": "if(isE2E(r.data))" in edge,
    "legacy global RCM loader removed": not (ROOT / "rcm-finance-loader.js").exists(),
    "legacy duplicate RCM renderer removed": not (ROOT / "rcm-finance-center.js").exists(),
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit(f"RCM contract gate failed: {', '.join(failed)}")

print("RCM contract gate: PASS")
