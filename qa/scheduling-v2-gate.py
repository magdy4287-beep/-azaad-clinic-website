from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / 'admin.html').read_text(encoding='utf-8')
ui = (ROOT / 'scheduling-v2.js').read_text(encoding='utf-8')
waiting = (ROOT / 'scheduling-v2-waiting.js').read_text(encoding='utf-8')

required_admin = [
    'scheduling-v2.js?v=1.0.0',
    'scheduling-v2-waiting.js?v=1.0.0',
]
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
for item in required_admin:
    if item not in admin:
        raise SystemExit(f'Missing admin wiring: {item}')
for item in required_ui:
    if item not in ui:
        raise SystemExit(f'Scheduling V2 missing: {item}')

for forbidden in (
    ".from('clinic_bookings').insert",
    ".from('clinic_bookings').update",
    ".from('clinic_bookings').delete",
    ".from('clinic_waiting_list').insert",
    ".from('clinic_waiting_list').update",
):
    if forbidden in ui or forbidden in waiting:
        raise SystemExit(f'Scheduling V2 must not write directly: {forbidden}')

if "invoke('ADD_WAITING'" not in waiting:
    raise SystemExit('Waiting UI must use ADD_WAITING action')

print('Scheduling V2 gate: PASS')
