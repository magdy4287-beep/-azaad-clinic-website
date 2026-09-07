#!/usr/bin/env python3
"""Fail closed if the active Frontdesk API drifts from AZAAD's canonical role model."""
from pathlib import Path
import re
import sys

path = Path("api/frontdesk-checkin.js")
text = path.read_text(encoding="utf-8")

canonical = ["OWNER", "ADMIN", "MANAGER", "SECRETARY", "RECEPTION", "CASHIER", "DOCTOR", "MARKETING"]
match = re.search(r"if \(!\[(.*?)\]\.includes\(role\)\)", text, re.S)
if not match:
    print("FAIL: frontdesk authorization role boundary not found")
    sys.exit(1)

roles = [item.strip().strip("'\"") for item in match.group(1).split(",") if item.strip()]
expected = ["OWNER", "ADMIN", "MANAGER", "SECRETARY", "RECEPTION", "CASHIER", "DOCTOR", "MARKETING"]
if roles != expected:
    print("FAIL: frontdesk role allowlist drift")
    print(f"actual={roles}")
    print(f"expected={expected}")
    sys.exit(1)

if "FRONTDESK" in text:
    print("FAIL: deprecated FRONTDESK role token remains in active frontdesk API")
    sys.exit(1)

print(f"PASS: canonical role boundary enforced ({', '.join(canonical)})")
