import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const ALLOWED_ORIGINS = new Set([
  "https://azaad-clinic-website.vercel.app",
  "https://azaad-clinic-website-magdy-team.vercel.app",
  "https://azaad-clinic-website-git-main-magdy-team.vercel.app",
  "https://magdy4287-beep.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
]);

function headers(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: headers(req) });

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) });
  if (req.method !== "GET") return json(req, { error: "method_not_allowed" }, 405);

  try {
    const url = new URL(req.url);
    if ((url.searchParams.get("api") || "slots") !== "slots") {
      return json(req, { error: "unknown_api" }, 404);
    }

    const doctorId = (url.searchParams.get("doctor") || "").trim();
    const serviceId = (url.searchParams.get("service") || "").trim();
    const date = (url.searchParams.get("date") || "").trim();
    const mode = (url.searchParams.get("mode") || "clinic").trim().toLowerCase();

    if (!doctorId || !serviceId || !date) return json(req, { error: "missing_booking_data" }, 400);
    if (!["clinic", "online"].includes(mode)) return json(req, { error: "invalid_mode" }, 400);
    if (!validDate(date)) return json(req, { error: "invalid_date" }, 400);

    const { data, error } = await db.rpc("clinic_public_available_slots", {
      p_doctor_id: doctorId,
      p_service_id: serviceId,
      p_appointment_date: date,
      p_mode: mode,
    });

    if (error) {
      console.error("azaad-public-scheduling rpc error", error.message);
      return json(req, { error: "scheduling_failed" }, 500);
    }

    const slots = (data ?? [])
      .map((row: { slot_time?: unknown }) => String(row?.slot_time ?? "").slice(0, 5))
      .filter((slot: string) => /^\d{2}:\d{2}$/.test(slot));

    return json(req, { slots });
  } catch (error) {
    console.error("azaad-public-scheduling error", error);
    return json(req, { error: "scheduling_failed" }, 500);
  }
});
