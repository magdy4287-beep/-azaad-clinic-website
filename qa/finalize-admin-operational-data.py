from pathlib import Path

path = Path("admin.js")
if not path.is_file():
    raise SystemExit("admin.js is required")

text = path.read_text(encoding="utf-8")

old_date = '''function todayISO() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}'''
new_date = '''function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}'''
if old_date in text:
    text = text.replace(old_date, new_date, 1)

needle = '''          .select(`
            id,
            booking_code,
            patient_name,
            patient_phone,
            appointment_date,
            appointment_time,
            status,
            mode,
            doctor_id,
            service_id
          `)'''
replacement = needle + '''
          // Controlled E2E fixtures are created on-demand by the protected E2E
          // factory and must never contaminate the operational Admin dashboard.
          .not("booking_code", "like", "E2E-%")'''
if 'Controlled E2E fixtures are created on-demand' not in text:
    if needle not in text:
        raise SystemExit("Canonical booking query shape not found; refusing unsafe patch")
    text = text.replace(needle, replacement, 1)

path.write_text(text, encoding="utf-8")
print("finalize-admin-operational-data.py completed successfully")
