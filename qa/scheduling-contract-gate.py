#!/usr/bin/env python3
"""Fail-closed contract for the canonical scheduling artifact.

The scheduler has a source HTML surface plus an explicit production transform.
This gate validates the artifact after that transform has run, so source-only
legacy implementation details cannot create false failures or false passes.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return (ROOT / name).read_text(encoding="utf-8")

schedule = read("schedule-center-v1.html")
transform = read("qa/finalize-schedule-center-appwrite.py")
admin_api = read("api/admin-appointments.js")

checks = {
    "schedule source exists": '<main class="wrap">' in schedule and 'id="root"' in schedule,
    "doctor selector exists": 'id="doctor"' in schedule,
    "date selector exists": 'id="date"' in schedule,
    "view controls exist": all(f'data-view="{v}"' in schedule for v in ('day','week','month')),
    "refresh control exists": 'id="refresh"' in schedule,
    "previous/next controls exist": 'id="prev"' in schedule and 'id="next"' in schedule,
    "search control exists": 'id="search"' in schedule,
    "weekday/date rendering contract": "toLocaleDateString('ar-EG'" in schedule and "appointment_date" in schedule,
    "appointment time rendering contract": "appointment_time" in schedule,
    "canonical auth boundary": "fetch('/api/admin-auth')" in schedule and "credentials:'include'" in schedule,
    "canonical Neon appointments boundary": "fetch(`/api/admin-appointments?from=" in schedule and "provider:'appwrite-neon'" in admin_api,
    "legacy Supabase schedule runtime absent": all(x not in schedule.lower() for x in ('supabase.co','createClient(','functions/v1/')),
    "legacy browser schedule fields are not required": 'buffer_minutes' not in transform and 'max_daily_bookings' not in transform,
    "transform is explicit production owner": "expected exactly one legacy schedule runtime module" in transform and "path.write_text" in transform,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit(f"Scheduling contract gate failed: {', '.join(failed)}")

print(f"Scheduling contract gate passed: {len(checks)}/{len(checks)}")
