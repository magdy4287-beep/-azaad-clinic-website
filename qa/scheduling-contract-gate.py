#!/usr/bin/env python3
"""Fail-closed contract for the canonical scheduling artifact.

The scheduler has a legacy source HTML surface plus an explicit production
transform. CI must remain read-only: this gate validates both contracts
without rewriting the checked-out repository. The immutable production build
owns application of the transform.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


schedule = read("schedule-center-v1.html")
transform = read("qa/finalize-schedule-center-appwrite.py")
admin_api = read("api/admin-appointments.js")
vercel_build = read("qa/vercel-build.py")

checks = {
    "schedule source exists": '<main class="wrap">' in schedule and 'id="root"' in schedule,
    "doctor selector exists": 'id="doctor"' in schedule,
    "date selector exists": 'id="date"' in schedule,
    "view controls exist": all(f'data-view="{v}"' in schedule for v in ('day', 'week', 'month')),
    "refresh control exists": 'id="refresh"' in schedule,
    "previous/next controls exist": 'id="prev"' in schedule and 'id="next"' in schedule,
    "search control exists": 'id="search"' in schedule,
    "legacy source is explicitly isolated": "createClient(" in schedule and "functions/v1/" in schedule,
    "weekday/date rendering contract": "toLocaleDateString('ar-EG'" in transform and "appointment_date" in transform,
    "appointment time rendering contract": "appointment_time" in transform,
    "canonical auth boundary": "api('/api/admin-auth')" in transform and "credentials:'include'" in transform,
    "canonical Neon appointments boundary": "api(`/api/admin-appointments?from=" in transform and "provider:'appwrite-neon'" in admin_api,
    "production transform removes legacy Supabase runtime": all(
        x not in transform.lower() for x in ('supabase.co', 'createclient(', 'functions/v1/')
    ),
    "legacy browser schedule fields are not required": 'buffer_minutes' not in transform and 'max_daily_bookings' not in transform,
    "transform is explicit production owner": "expected exactly one legacy schedule runtime module" in transform and "path.write_text" in transform,
    "production build applies transform": "qa/finalize-schedule-center-appwrite.py" in vercel_build,
    "gate remains read-only": "path.write_text" not in Path(__file__).read_text(encoding="utf-8"),
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")

if failed:
    raise SystemExit(f"Scheduling contract gate failed: {', '.join(failed)}")

print(f"Scheduling contract gate passed: {len(checks)}/{len(checks)}")
