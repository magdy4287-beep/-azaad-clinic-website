#!/usr/bin/env python3
"""Azaad locale architecture gate.

This is intentionally conservative: it checks repository contracts without
pretending to prove browser-level translation behavior. Browser E2E remains a
separate release gate.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

required = [
    "docs/AZAAD-IMPLEMENTATION-MAP.md",
    "frontdesk-appointment-status.js",
]
for rel in required:
    if not (ROOT / rel).exists():
        raise SystemExit(f"FAIL: missing required contract file: {rel}")

status = (ROOT / "frontdesk-appointment-status.js").read_text(encoding="utf-8")
contract = (ROOT / "docs/AZAAD-IMPLEMENTATION-MAP.md").read_text(encoding="utf-8")

checks = {
    "canonical status keys exist": all(k in status for k in ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_CLINIC", "WITH_DOCTOR", "NO_SHOW", "CANCELLED"]),
    "status metadata uses translation keys": "appointment.status." in status,
    "contract forbids language mutation of data": "must not change database state" in contract,
    "contract requires locale-aware dates": "active locale and clinic timezone" in contract,
    "contract requires safe translation failure": "degrade safely" in contract,
    "contract requires idempotent translation": "idempotent" in contract,
    "contract covers admin and patient locale E2E": "Admin + Patient + Front Desk + Doctor locale E2E" in contract,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit("Locale stability contract failed: " + ", ".join(failed))

print(f"Locale stability contract passed: {len(checks)}/{len(checks)}")
print("Browser-level mixed-language and freeze testing remains an E2E requirement.")
