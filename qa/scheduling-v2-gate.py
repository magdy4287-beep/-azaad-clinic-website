from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / 'admin.html').read_text(encoding='utf-8')
ui = (ROOT / 'scheduling-v2.js').read_text(encoding='utf-8')

required_ui = [
    'clinic_doctors',
    'clinic_services',
    'clinic_bookings',
    'doctor_weekly_schedules',
    'doctor_schedule_overrides',
    'clinic_waiting_list',
    "functions.invoke('azaad-appointments-actions'",
    "BOOK",
    "RESCHEDULE",
    "TRANSFER",
    "CANCEL",
    "NO_SHOW",
    "ASSIGN_WAITING",
    "ADD_WAITING",
]
for item in required_ui:
    if item not in ui:
        raise SystemExit(f'Scheduling V2 missing: {item}')

# The runtime has one Scheduling V2 owner. The obsolete second waiting-list
# submit handler was removed; ADD_WAITING is owned by scheduling-v2.js itself.
if 'scheduling-v2-waiting.js' in admin:
    raise SystemExit('Obsolete duplicate waiting-list runtime must not be wired into Admin')

for forbidden in (
    ".from('clinic_bookings').insert",
    ".from('clinic_bookings').update",
    ".from('clinic_bookings').delete",
    ".from('clinic_waiting_list').insert",
    ".from('clinic_waiting_list').update",
):
    if forbidden in ui:
        raise SystemExit(f'Scheduling V2 must not write directly: {forbidden}')

print('Scheduling V2 gate: PASS — single runtime owner')
