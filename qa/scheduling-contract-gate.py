#!/usr/bin/env python3
"""Free structural acceptance gate for Azaad Clinic doctor scheduling.

The gate checks the actual Admin UI source for the scheduling contract. It does
not require .github/patch-admin.py to contain runtime scheduling code because
that patcher is only a source/build patch layer. Persistence/schema validation
remains a separate Supabase verification step.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return (ROOT / name).read_text(encoding="utf-8")

admin = read("admin.html")
patch = read(".github/patch-admin.py")

checks = {
    "active doctor selector exists": 'id="scheduleDoctor"' in admin,
    "schedule editor exists": 'id="scheduleEditor"' in admin,
    "schedule surface exists": any(token in admin for token in ('schedule', 'Schedule', 'جدول', 'جداول')),
    "weekday contract": "weekday" in admin,
    "enabled contract": "enabled" in admin,
    "time contract": "start_time" in admin and "end_time" in admin,
    "break contract": "break_start" in admin and "break_end" in admin,
    "slot contract": "slot_minutes" in admin,
    "buffer contract": "buffer_minutes" in admin,
    "capacity contract": "max_daily_bookings" in admin,
    "mode contract": "mode" in admin,
    "admin patcher remains present": "patch_admin_html" in patch,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit(f"Scheduling contract gate failed: {', '.join(failed)}")

print(f"Scheduling contract gate passed: {len(checks)}/{len(checks)}")
