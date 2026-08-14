#!/usr/bin/env python3
"""Free structural acceptance gate for Azaad Clinic doctor scheduling.

This gate verifies the frontend contains the scheduling contract while the
actual persistence contract is verified against Supabase schema separately.
It intentionally does not mutate production data.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return (ROOT / name).read_text(encoding="utf-8")

admin = read("admin.html")
patch = read(".github/patch-admin.py")

checks = {
    "schedule panel exists": 'id="schedules"' in admin,
    "active doctor selector exists": 'id="scheduleDoctor"' in admin,
    "schedule editor exists": 'id="scheduleEditor"' in admin,
    "weekday contract": all(x in patch for x in ["weekday", "enabled"]),
    "time contract": all(x in patch for x in ["start_time", "end_time"]),
    "break contract": all(x in patch for x in ["break_start", "break_end"]),
    "slot contract": "slot_minutes" in patch,
    "buffer contract": "buffer_minutes" in patch,
    "capacity contract": "max_daily_bookings" in patch,
    "mode contract": "mode" in patch,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit(f"Scheduling contract gate failed: {', '.join(failed)}")

print(f"Scheduling contract gate passed: {len(checks)}/{len(checks)}")
