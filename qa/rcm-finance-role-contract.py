#!/usr/bin/env python3
from pathlib import Path
root = Path(__file__).resolve().parents[1]
text = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in root.glob("*.js"))
required = ["RCM", "Finance", "invoice", "payment"]
missing = [x for x in required if x.lower() not in text.lower()]
if missing:
    raise SystemExit("Missing RCM/Finance contract: " + ", ".join(missing))
print("PASS: RCM/Finance role contract")
