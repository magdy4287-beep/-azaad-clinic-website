#!/usr/bin/env python3
"""Free structural acceptance gate for Azaad Clinic doctor scheduling.

The gate checks the real Admin UI runtime source: admin.html plus the
admin enhancement layer injected at runtime. It does not require
.github/patch-admin.py to contain runtime scheduling code because that patcher
is only a source/build patch layer. Persistence/schema validation remains a
separate Supabase verification step.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return (ROOT / name).read_text(encoding="utf-8")

admin = read("admin.html")
enhancements = read("admin-enhancements-v1.js")
patch = read(".github/patch-admin.py")
runtime_source = admin + "\n" + enhancements

checks = {
    "active doctor selector exists": 'id="scheduleDoctor"' in runtime_source,
    "schedule editor exists": 'id="scheduleEditor"' in runtime_source,
    "schedule surface exists": any(token in runtime_source for token in ('schedule', 'Schedule', 'جدول', 'جداول')),
    "weekday contract": "weekday" in runtime_source,
    "enabled contract": "enabled" in runtime_source,
    "time contract": "start_time" in runtime_source and "end_time" in runtime_source,
    "break contract": "break_start" in runtime_source and "break_end" in runtime_source,
    "slot contract": "slot_minutes" in runtime_source,
    "buffer contract": "buffer_minutes" in runtime_source,
    "capacity contract": "max_daily_bookings" in runtime_source,
    "mode contract": "mode" in runtime_source,
    "admin patcher remains present": "patch_admin_html" in patch,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit(f"Scheduling contract gate failed: {', '.join(failed)}")

print(f"Scheduling contract gate passed: {len(checks)}/{len(checks)}")
