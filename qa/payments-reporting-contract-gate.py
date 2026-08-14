#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
files = {}
for name in ["admin.html", "admin-enhancements-v1.js", "app.js", "finance.js", "rcm.js"]:
    p = ROOT / name
    files[name] = p.read_text(encoding="utf-8") if p.exists() else ""
text = "\n".join(files.values())
checks = {
    "payment": r"payment|payments|paid",
    "invoice": r"invoice|invoices",
    "outstanding": r"outstanding|balance|remaining|due",
    "amount": r"amount|total|subtotal|price",
    "daily reporting": r"daily|day|today",
    "monthly reporting": r"monthly|month",
    "annual reporting": r"annual|year|yearly",
    "date filtering": r"date|start_date|end_date|from_date|to_date",
}
failed=[]
for name, pattern in checks.items():
    ok=bool(re.search(pattern,text,re.I))
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
    if not ok: failed.append(name)
if failed:
    raise SystemExit("Payments/reporting contract gate failed: " + ", ".join(failed))
print("Payments/reporting contract gate: PASS")
