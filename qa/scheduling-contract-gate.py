#!/usr/bin/env python3
"""Fail-closed contract for canonical Scheduling V2 ownership."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
schedule=(ROOT/"scheduling-v2.js").read_text(encoding="utf-8")
api=(ROOT/"api/_admin-appointments.js").read_text(encoding="utf-8")
lazy=(ROOT/"qa/lazy-admin-modules.py").read_text(encoding="utf-8")
checks={
 "canonical scheduling source": "AZAAD_SCHEDULING_V2" in schedule and "Appwrite session" in schedule,
 "canonical scheduling API": "/api/admin-appointments?resource=scheduling" in schedule,
 "HttpOnly session boundary": "credentials:'include'" in schedule and "cache:'no-store'" in schedule,
 "Neon backend": "provider:'appwrite-neon'" in api,
 "appointment date/time": "appointment_date" in api and "appointment_time" in api,
 "waiting list boundary": "ADD_WAITING" in schedule and "ASSIGN_WAITING" in schedule,
 "scheduling is lazy-owned": '"schedules":' in lazy and "scheduling-v2.js" in lazy,
 "no legacy transform required": "TRANSFORM_STEPS=[]" in (ROOT/"qa/vercel-build.py").read_text(encoding="utf-8"),
}
for n,ok in checks.items(): print(("PASS" if ok else "FAIL")+": "+n)
bad=[n for n,ok in checks.items() if not ok]
if bad: raise SystemExit("Scheduling contract gate failed: "+", ".join(bad))
print(f"Scheduling contract gate passed: {len(checks)}/{len(checks)}")
