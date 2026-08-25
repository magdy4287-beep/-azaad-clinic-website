from pathlib import Path

path = Path("admin.js")
if not path.is_file():
    raise SystemExit("admin.js is required")

text = path.read_text(encoding="utf-8")

needle = '''          .select(`\n            id,\n            booking_code,\n            patient_name,\n            patient_phone,\n            appointment_date,\n            appointment_time,\n            status,\n            mode,\n            doctor_id,\n            service_id\n          `)'''

replacement = needle + '''\n          // Controlled E2E fixtures are created on-demand by the protected E2E\n          // factory and must never contaminate the operational Admin dashboard.\n          .not("booking_code", "like", "E2E-%")'''

if 'Controlled E2E fixtures are created on-demand' not in text:
    if needle not in text:
        raise SystemExit("Canonical booking query shape not found; refusing unsafe patch")
    text = text.replace(needle, replacement, 1)

path.write_text(text, encoding="utf-8")
print("finalize-admin-operational-data.py completed successfully")