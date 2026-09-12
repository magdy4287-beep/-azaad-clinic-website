#!/usr/bin/env python3
"""Fail closed if the active Frontdesk API boundary drifts from AZAAD's canonical role model."""
from pathlib import Path
import re
import sys

path = Path("api/clinical-assessments.js")
text = path.read_text(encoding="utf-8")

canonical = ["OWNER", "ADMIN", "MANAGER", "SECRETARY", "RECEPTION", "CASHIER", "DOCTOR", "MARKETING"]
match = re.search(r"FRONTDESK_ROLES\s*=\s*new Set\(\[(.*?)\]\)", text, re.S)
if not match:
    print("FAIL: consolidated frontdesk authorization role boundary not found")
    sys.exit(1)

roles = [item.strip().strip("'\"") for item in match.group(1).split(",") if item.strip()]
if roles != canonical:
    print("FAIL: frontdesk role allowlist drift")
    print(f"actual={roles}")
    print(f"expected={canonical}")
    sys.exit(1)

if "FRONTDESK" in text:
    print("FAIL: deprecated FRONTDESK role token remains in active clinical API")
    sys.exit(1)

if "action==='check-in'" not in text:
    print("FAIL: consolidated frontdesk check-in action missing")
    sys.exit(1)

print(f"PASS: canonical frontdesk role boundary enforced ({', '.join(canonical)})")
