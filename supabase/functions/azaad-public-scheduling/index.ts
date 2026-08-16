import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

const toMinutes = (value: unknown) => {
  const match = String(value ?? "").slice(0, 5).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
};

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

function cairoNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

async function durationsFor(rows: Array<{ service_id?: string }>) {
  const ids = [...new Set(rows.map((r) => String(r.service_id ?? "")).filter(Boolean))];
  const result = new Map<string, number>();
  if (!ids.length) return result;
  const { data, error } = await db
    .from("clinic_services")
    .select("id,duration_minutes")
    .in("id", ids);
  if (error) throw error;
  for (const row of data ?? []) result.set(String(row.id), Number(row.duration_minutes || 30));
  return result;
}

async function resolveSchedule(doctorId: string, date: string, mode: "clinic" | "online") {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const [{ data: clinic, error: clinicError }, { data: doctorRows, error: doctorError },
    { data: holidays, error: holidayError }, { data: override, error: overrideError }] = await Promise.all([
      db.from("clinic_working_hours").select("weekday,enabled,start_time,end_time,break_start,break_end").eq("weekday", weekday).maybeSingle(),
      db.from("doctor_weekly_schedules").select("*").eq("doctor_id", doctorId).eq("weekday", weekday).eq("enabled", true),
      db.from("clinic_holidays").select("applies_to,doctor_id,closed").lte("start_date", date).gte("end_date", date),
      db.from("doctor_schedule_overrides").select("*").eq("doctor_id", doctorId).eq("override_date", date).maybeSingle(),
    ]);
  if (clinicError || doctorError || holidayError || overrideError) throw clinicError || doctorError || holidayError || overrideError;

  for (const holiday of holidays ?? []) {
    if (holiday.closed && (holiday.applies_to === "clinic" || holiday.applies_to === "all" ||
      (holiday.applies_to === "doctor" && String(holiday.doctor_id) === doctorId))) return null;
  }

  if (override?.type && ["closed", "off", "unavailable", "holiday"].includes(String(override.type).toLowerCase())) return null;

  const compatible = (doctorRows ?? []).find((row) =>
    row.mode === "both" || row.mode === mode || (mode === "clinic" && row.mode === "in_clinic"),
  );
  let base = compatible ?? clinic;
  if (!base || base.enabled === false) return null;

  base = { ...base };
  if (override) {
    for (const key of ["start_time", "end_time", "break_start", "break_end", "slot_minutes", "buffer_minutes", "max_daily_bookings"]) {
      if (override[key] !== null && override[key] !== undefined) base[key] = override[key];
    }
  }
  return base;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    if ((url.searchParams.get("api") || "slots") !== "slots") return json({ error: "Unknown API" }, 404);

    const doctorId = (url.searchParams.get("doctor") || "").trim();
    const serviceId = (url.searchParams.get("service") || "").trim();
    const date = (url.searchParams.get("date") || "").trim();
    const mode = (url.searchParams.get("mode") || "clinic").trim().toLowerCase();

    if (!doctorId || !serviceId || !date) return json({ error: "بيانات الموعد ناقصة" }, 400);
    if (!["clinic", "online"].includes(mode)) return json({ error: "نوع الجلسة غير صالح" }, 400);
    if (!validDate(date)) return json({ error: "التاريخ غير صحيح" }, 400);

    const now = cairoNow();
    if (date < now.date) return json({ slots: [] });

    const [{ data: doctor, error: doctorError }, { data: service, error: serviceError }] = await Promise.all([
      db.from("clinic_doctors").select("id,active,services").eq("id", doctorId).maybeSingle(),
      db.from("clinic_services").select("id,active,duration_minutes").eq("id", serviceId).maybeSingle(),
    ]);
    if (doctorError || serviceError) throw doctorError || serviceError;
    if (!doctor?.active || !service?.active) return json({ slots: [] });

    const assigned = Array.isArray(doctor.services) ? doctor.services.map((x: unknown) => String(x)) : [];
    if (assigned.length && !assigned.includes(serviceId)) return json({ slots: [] });

    const schedule = await resolveSchedule(doctorId, date, mode as "clinic" | "online");
    if (!schedule) return json({ slots: [] });

    const duration = Number(service.duration_minutes || 30);
    const buffer = Number(schedule.buffer_minutes || 0);
    const maxDaily = schedule.max_daily_bookings == null ? null : Number(schedule.max_daily_bookings);

    const { data: bookings, error: bookingsError } = await db
      .from("clinic_bookings")
      .select("appointment_time,service_id,status,mode")
      .eq("doctor_id", doctorId)
      .eq("appointment_date", date)
      .eq("mode", mode)
      .in("status", ["pending", "confirmed"]);
    if (bookingsError) throw bookingsError;

    if (maxDaily !== null && maxDaily >= 0 && (bookings?.length ?? 0) >= maxDaily) return json({ slots: [] });

    const bookingDurations = await durationsFor(bookings ?? []);
    const start = toMinutes(schedule.start_time);
    const end = toMinutes(schedule.end_time);
    const breakStart = schedule.break_start ? toMinutes(schedule.break_start) : null;
    const breakEnd = schedule.break_end ? toMinutes(schedule.break_end) : null;
    const step = Math.max(5, Number(schedule.slot_minutes || duration));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return json({ slots: [] });

    const slots: string[] = [];
    for (let minute = start; minute + duration <= end; minute += step) {
      if (date === now.date && minute <= now.minutes) continue;
      if (breakStart !== null && breakEnd !== null && minute < breakEnd && minute + duration > breakStart) continue;
      const conflict = (bookings ?? []).some((booking) => {
        const bookedAt = toMinutes(booking.appointment_time);
        const bookedDuration = bookingDurations.get(String(booking.service_id ?? "")) ?? 30;
        return minute < bookedAt + bookedDuration + buffer && minute + duration + buffer > bookedAt;
      });
      if (!conflict) slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
    }

    return json({ slots });
  } catch (error) {
    console.error("azaad-public-scheduling error", error);
    return json({ error: error instanceof Error ? error.message : "Server error" }, 500);
  }
});
