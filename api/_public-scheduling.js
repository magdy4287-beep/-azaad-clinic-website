import { neon } from '@neondatabase/serverless';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function bad(res, message) { return res.status(400).json({ error: message }); }

function minutes(value) {
  const m = String(value || '').slice(0, 5).match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function timeText(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}
function weekday(date) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Runtime database is not configured' });
  const { doctor_id: doctorId, service_id: serviceId, date, mode = 'clinic' } = req.query || {};
  if (!UUID.test(String(doctorId || ''))) return bad(res, 'Invalid doctor');
  if (!UUID.test(String(serviceId || ''))) return bad(res, 'Invalid service');
  if (!ISO_DATE.test(String(date || ''))) return bad(res, 'Invalid date');
  if (!['clinic', 'online'].includes(String(mode))) return bad(res, 'Invalid mode');

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [scheduleRows, overrideRows, holidayRows, serviceRows, bookingRows] = await Promise.all([
      sql`SELECT weekday, enabled, start_time, end_time, break_start, break_end, slot_minutes, buffer_minutes, max_daily_bookings, mode FROM public.doctor_weekly_schedules WHERE doctor_id = ${doctorId} AND weekday = ${weekday(date)} AND enabled = true`,
      sql`SELECT type, start_time, end_time, break_start, break_end, slot_minutes, buffer_minutes, max_daily_bookings FROM public.doctor_schedule_overrides WHERE doctor_id = ${doctorId} AND override_date = ${date} LIMIT 1`,
      sql`SELECT applies_to, doctor_id, closed FROM public.clinic_holidays WHERE closed = true AND start_date <= ${date} AND end_date >= ${date} AND (applies_to = 'clinic' OR (applies_to = 'doctor' AND doctor_id = ${doctorId}))`,
      sql`SELECT id, duration_minutes FROM public.clinic_services WHERE id = ${serviceId} AND active = true LIMIT 1`,
      sql`SELECT appointment_time, status FROM public.clinic_bookings WHERE doctor_id = ${doctorId} AND appointment_date = ${date} AND status NOT IN ('cancelled', 'no_show')`
    ]);

    if (!serviceRows[0]) return res.status(404).json({ error: 'Service not found' });
    if (holidayRows.length) return res.status(200).json({ date, doctor_id: doctorId, service_id: serviceId, mode, slots: [] });

    let schedule = scheduleRows.find((row) => row.mode === 'both' || row.mode === mode);
    const override = overrideRows[0];
    if (override) {
      if (override.type === 'closed') return res.status(200).json({ date, doctor_id: doctorId, service_id: serviceId, mode, slots: [] });
      schedule = { ...(schedule || {}), ...override };
    }
    if (!schedule || !schedule.start_time || !schedule.end_time) return res.status(200).json({ date, doctor_id: doctorId, service_id: serviceId, mode, slots: [] });

    const duration = Number(serviceRows[0].duration_minutes) || 60;
    const step = Number(schedule.slot_minutes) || duration;
    const buffer = Number(schedule.buffer_minutes) || 0;
    const start = minutes(schedule.start_time);
    const end = minutes(schedule.end_time);
    const breakStart = minutes(schedule.break_start);
    const breakEnd = minutes(schedule.break_end);
    if (start === null || end === null || end <= start) return res.status(200).json({ date, doctor_id: doctorId, service_id: serviceId, mode, slots: [] });

    const booked = new Set(bookingRows.map((row) => String(row.appointment_time).slice(0, 5)));
    const maxDaily = schedule.max_daily_bookings == null ? null : Number(schedule.max_daily_bookings);
    if (maxDaily !== null && bookingRows.length >= maxDaily) return res.status(200).json({ date, doctor_id: doctorId, service_id: serviceId, mode, slots: [] });

    const slots = [];
    for (let t = start; t + duration <= end; t += step + buffer) {
      const slotEnd = t + duration;
      if (breakStart !== null && breakEnd !== null && t < breakEnd && slotEnd > breakStart) continue;
      const text = timeText(t);
      if (!booked.has(text.slice(0, 5))) slots.push(text);
    }
    return res.status(200).json({ date, doctor_id: doctorId, service_id: serviceId, mode, slots });
  } catch (error) {
    console.error('public-scheduling failed', error);
    return res.status(503).json({ error: 'Scheduling unavailable' });
  }
}
