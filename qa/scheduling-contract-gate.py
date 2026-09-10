#!/usr/bin/env python3
"""Structural acceptance gate for the canonical Azaad Clinic scheduling surface.

The current scheduling architecture is a read/visualization surface backed by
Appwrite-authenticated Neon appointments. Editing schedule policy is owned by
the dedicated schedule-center transform and is not inferred from obsolete DOM
fields that belonged to the retired browser-local scheduler.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return (ROOT / name).read_text(encoding="utf-8")

schedule = read("schedule-center-v1.html")
transform = read("qa/finalize-schedule-center-appwrite.py")
admin_api = read("api/admin-appointments.js")

checks = {
    "schedule source exists": '<div id="root"' in schedule,
    "doctor selector exists": 'id="doctor"' in schedule,
    "date selector exists": 'id="date"' in schedule,
    "view controls exist": 'data-view="day"' in schedule and 'data-view="week"' in schedule and 'data-view="month"' in schedule,
    "refresh control exists": 'id="refresh"' in schedule,
    "previous/next controls exist": 'id="prev"' in schedule and 'id="next"' in schedule,
    "search control exists": 'id="search"' in schedule,
    "weekday/date rendering contract": "toLocaleDateString('ar-EG'" in transform and "appointment_date" in transform,
    "appointment time rendering contract": "appointment_time" in transform,
    "canonical auth boundary": "fetch('/api/admin-auth'" in transform and "credentials:'include'" in transform,
    "canonical Neon appointments boundary": "fetch(`/api/admin-appointments?from=" in transform and "provider:'appwrite-neon'" in admin_api,
    "legacy Supabase schedule runtime absent": 'supabase.co' not in transform.lower() and 'createClient(' not in transform and 'functions/v1/' not in transform,
    "legacy browser schedule fields are not required": 'buffer_minutes' not in transform and 'max_daily_bookings' not in transform,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit(f"Scheduling contract gate failed: {', '.join(failed)}")

print(f"Scheduling contract gate passed: {len(checks)}/{len(checks)}")
