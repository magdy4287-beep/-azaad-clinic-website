#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
enterprise_path = ROOT / "admin-enterprise-centers.js"
legacy_loader = ROOT / "rcm-finance-loader.js"
legacy_renderer = ROOT / "rcm-finance-center.js"

if not enterprise_path.is_file():
    raise SystemExit("RCM contract gate failed: canonical Enterprise Admin owner is missing")

enterprise = enterprise_path.read_text(encoding="utf-8")
checks = {
    "enterprise RCM owner": "if(key==='rcm')" in enterprise,
    "canonical invoice backend boundary": "azaad-invoice-center?api=invoices" in enterprise,
    "authenticated backend call": "Authorization:`Bearer ${t}`" in enterprise,
    "RCM summary is rendered from backend response": "d.summary||{}" in enterprise and "s.count" in enterprise,
    "E2E boundary is delegated to invoice backend": "azaad-invoice-center" in enterprise,
    "legacy global RCM loader removed": not legacy_loader.exists(),
    "legacy duplicate RCM renderer removed": not legacy_renderer.exists(),
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
if failed:
    raise SystemExit(f"RCM contract gate failed: {', '.join(failed)}")
print("RCM contract gate: PASS")
