import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

function json(res, status, body) { return res.status(status).json(body); }
function normalizePhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `20${digits.slice(1)}`;
  return digits;
}
function validPhone(value) {
  const digits = normalizePhone(value);
  return /^20(10|11|12|15)\d{8}$/.test(digits);
}
function timeMinutes(value) {
  const m = String(value || '').slice(0, 5).match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function weekday(date) { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
function bookingCode(date) { return `AZA-${date.replaceAll('-', '')}-${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`; }
function mrn() { return `AZA-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`; }

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!process.env.DATABASE_URL) return json(res, 503, { error: 'Runtime database is not configured' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const doctorId = String(body.doctor_id || '').trim();
  const serviceId = String(body.service_id || '').trim();
  const appointmentDate = String(body.appointment_date || '').trim();
  const appointmentTime = String(body.appointment_time || '').trim().slice(0, 8);
  const mode = String(body.mode || 'clinic').trim();
  const patientName = String(body.patient_name || '').trim();
  const phone = String(body.patient_phone || '').trim();
  const normalizedPhone = normalizePhone(phone);
  const email = body.patient_email ? String(body.patient_email).trim() : null;
  const notes = body.notes ? String(body.notes).trim().slice(0, 4000) : null;
  const language = body.patient_language === 'en' ? 'en' : body.patient_language === 'ar' ? 'ar' : null;
  const patientId = body.patient_id ? String(body.patient_id).trim() : null;

  if (!UUID.test(doctorId)) return json(res, 400, { error: 'Invalid doctor' });
  if (!UUID.test(serviceId)) return json(res, 400, { error: 'Invalid service' });
  if (!DATE.test(appointmentDate)) return json(res, 400, { error: 'Invalid appointment date' });
  if (!TIME.test(appointmentTime)) return json(res, 400, { error: 'Invalid appointment time' });
  if (!['clinic', 'online'].includes(mode)) return json(res, 400, { error: 'Invalid mode' });
  if (patientName.length < 3 || patientName.length > 200) return json(res, 400, { error: 'Invalid patient name' });
  if (!validPhone(phone)) return json(res, 400, { error: 'Invalid phone' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: 'Invalid email' });
  if (patientId && !UUID.test(patientId)) return json(res, 400, { error: 'Invalid patient context' });

  const gender = ['male', 'female'].includes(body.gender) ? body.gender : null;
  const maritalStatus = ['single', 'married', 'divorced', 'widowed'].includes(body.marital_status) ? body.marital_status : null;
  const residence = body.residence ? String(body.residence).trim().slice(0, 500) : null;
  const dateOfBirth = body.date_of_birth && DATE.test(String(body.date_of_birth)) ? String(body.date_of_birth) : null;

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [doctorRows, serviceRows, scheduleRows, overrideRows, holidayRows, existingBookings] = await Promise.all([
      sql`SELECT id, active FROM public.clinic_doctors WHERE id = ${doctorId} LIMIT 1`,
      sql`SELECT id, active, duration_minutes FROM public.clinic_services WHERE id = ${serviceId} LIMIT 1`,
      sql`SELECT weekday, enabled, start_time, end_time, break_start, break_end, slot_minutes, buffer_minutes, max_daily_bookings, mode FROM public.doctor_weekly_schedules WHERE doctor_id = ${doctorId} AND weekday = ${weekday(appointmentDate)} AND enabled = true`,
      sql`SELECT type, start_time, end_time, break_start, break_end, slot_minutes, buffer_minutes, max_daily_bookings FROM public.doctor_schedule_overrides WHERE doctor_id = ${doctorId} AND override_date = ${appointmentDate} LIMIT 1`,
      sql`SELECT id FROM public.clinic_holidays WHERE closed = true AND start_date <= ${appointmentDate} AND end_date >= ${appointmentDate} AND (applies_to = 'clinic' OR (applies_to = 'doctor' AND doctor_id = ${doctorId})) LIMIT 1`,
      sql`SELECT appointment_time FROM public.clinic_bookings WHERE doctor_id = ${doctorId} AND appointment_date = ${appointmentDate} AND status NOT IN ('cancelled', 'no_show')`
    ]);

    if (!doctorRows[0]?.active) return json(res, 404, { error: 'Doctor not found' });
    if (!serviceRows[0]?.active) return json(res, 404, { error: 'Service not found' });
    if (holidayRows.length) return json(res, 409, { error: 'Appointment unavailable' });

    let schedule = scheduleRows.find((row) => row.mode === 'both' || row.mode === mode);
    const override = overrideRows[0];
    if (override?.type === 'closed') return json(res, 409, { error: 'Appointment unavailable' });
    if (override) schedule = { ...(schedule || {}), ...override };
    if (!schedule) return json(res, 409, { error: 'Appointment unavailable' });

    const start = timeMinutes(schedule.start_time);
    const end = timeMinutes(schedule.end_time);
    const requested = timeMinutes(appointmentTime);
    const duration = Number(serviceRows[0].duration_minutes) || 60;
    const step = Number(schedule.slot_minutes) || duration;
    const buffer = Number(schedule.buffer_minutes) || 0;
    const breakStart = timeMinutes(schedule.break_start);
    const breakEnd = timeMinutes(schedule.break_end);
    if ([start, end, requested].some((v) => v === null) || requested < start || requested + duration > end) return json(res, 409, { error: 'Appointment unavailable' });
    if (breakStart !== null && breakEnd !== null && requested < breakEnd && requested + duration > breakStart) return json(res, 409, { error: 'Appointment unavailable' });
    if ((requested - start) % (step + buffer) !== 0) return json(res, 409, { error: 'Appointment unavailable' });
    if (existingBookings.some((row) => String(row.appointment_time).slice(0, 5) === appointmentTime.slice(0, 5))) return json(res, 409, { error: 'Appointment already booked' });

    const maxDaily = schedule.max_daily_bookings == null ? null : Number(schedule.max_daily_bookings);
    if (maxDaily !== null && existingBookings.length >= maxDaily) return json(res, 409, { error: 'Appointment unavailable' });

    const code = bookingCode(appointmentDate);
    const newMrn = mrn();
    const result = await sql.transaction([
      sql`SELECT pg_advisory_xact_lock(hashtext(${`${doctorId}|${appointmentDate}|${appointmentTime.slice(0, 5)}`}))`,
      sql`WITH existing_patient AS (
            SELECT id FROM public.clinic_patients
            WHERE active = true AND patient_phone_normalized = ${normalizedPhone}
            ORDER BY created_at ASC LIMIT 1
          ),
          locked_slot AS (
            SELECT id FROM public.clinic_bookings
            WHERE doctor_id = ${doctorId} AND appointment_date = ${appointmentDate} AND appointment_time = ${appointmentTime.slice(0, 5)}::time
              AND status NOT IN ('cancelled', 'no_show')
            LIMIT 1
          ),
          chosen_patient AS (
            SELECT id FROM existing_patient
            UNION ALL
            SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM existing_patient)
            LIMIT 1
          ),
          upsert_patient AS (
            INSERT INTO public.clinic_patients (id, mrn, patient_name, patient_phone, patient_phone_normalized, patient_email, date_of_birth, gender, marital_status, residence, active)
            SELECT id, CASE WHEN EXISTS (SELECT 1 FROM existing_patient) THEN NULL ELSE ${newMrn} END, ${patientName}, ${phone}, ${normalizedPhone}, ${email}, ${dateOfBirth}, ${gender}, ${maritalStatus}, ${residence}, true
            FROM chosen_patient
            WHERE NOT EXISTS (SELECT 1 FROM existing_patient)
            RETURNING id
          ),
          update_existing AS (
            UPDATE public.clinic_patients p
            SET patient_name = ${patientName}, patient_phone = ${phone}, patient_email = COALESCE(${email}, p.patient_email), date_of_birth = COALESCE(${dateOfBirth}, p.date_of_birth), gender = COALESCE(${gender}, p.gender), marital_status = COALESCE(${maritalStatus}, p.marital_status), residence = COALESCE(${residence}, p.residence), updated_at = now()
            FROM existing_patient e WHERE p.id = e.id RETURNING p.id
          ),
          target_patient AS (
            SELECT id FROM update_existing
            UNION ALL SELECT id FROM upsert_patient
            LIMIT 1
          ),
          inserted AS (
            INSERT INTO public.clinic_bookings (booking_code, doctor_id, service_id, patient_name, patient_phone, patient_email, appointment_date, appointment_time, mode, notes, status, patient_language, patient_id, payment_status, service_authorization_status)
            SELECT ${code}, ${doctorId}, ${serviceId}, ${patientName}, ${phone}, ${email}, ${appointmentDate}, ${appointmentTime.slice(0, 5)}::time, ${mode}, ${notes}, 'pending', ${language}, id, 'unpaid', 'pending'
            FROM target_patient
            WHERE NOT EXISTS (SELECT 1 FROM locked_slot)
            RETURNING id, booking_code, patient_id, appointment_date, appointment_time, mode
          )
          SELECT * FROM inserted LIMIT 1`,
      sql`INSERT INTO public.clinic_audit_events (actor_user_id, actor_staff_id, actor_role, action, entity_type, entity_id, details)
          SELECT NULL, NULL, 'PUBLIC', 'public_booking_created', 'booking', id,
                 jsonb_build_object('source','public_booking','mode',mode,'appointment_date',appointment_date,'appointment_time',appointment_time)
          FROM public.clinic_bookings WHERE booking_code = ${code} LIMIT 1`
    ]);

    const inserted = result[1]?.[0];
    if (!inserted) return json(res, 409, { error: 'Appointment already booked' });
    return json(res, 201, {
      success: true,
      booking: {
        id: inserted.id,
        booking_code: inserted.booking_code,
        patient_id: inserted.patient_id,
        appointment_date: inserted.appointment_date,
        appointment_time: inserted.appointment_time,
        mode: inserted.mode
      }
    });
  } catch (error) {
    console.error('public-booking failed', error);
    return json(res, 503, { error: 'Booking service unavailable' });
  }
}
