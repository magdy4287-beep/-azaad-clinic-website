import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ALLOWED_ORIGINS = new Set([
  "https://magdy4287-beep.github.io",
  "https://azaad-clinic-website.vercel.app",
  "https://azaad-clinic-website-magdy-team.vercel.app",
  "https://azaad-clinic-website-git-main-magdy-team.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
]);

function headers(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "content-type, apikey",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: headers(req) });

async function normalizePhone(phone: string) {
  const { data, error } = await db.rpc("clinic_normalize_phone", { p_phone: phone });
  if (error) throw error;
  return data ? String(data) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) });
  if (!["GET", "POST"].includes(req.method)) return json(req, { error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    let phone = url.searchParams.get("phone") || "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      phone = String(body.phone || phone || "");
    }

    phone = phone.trim();
    if (!phone) return json(req, { error: "PATIENT_PHONE_REQUIRED" }, 400);

    const normalized = await normalizePhone(phone);
    if (!normalized) return json(req, { error: "INVALID_PHONE" }, 400);

    const { data: patient, error } = await db
      .from("clinic_patients")
      .select("id,active")
      .eq("patient_phone_normalized", normalized)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!patient) {
      return json(req, { found: false });
    }

    // Privacy boundary: public lookup reveals only existence and an opaque internal
    // patient reference required by the booking flow. Never return MRN, name,
    // phone, email, DOB, bookings, or clinical/financial data to an unauthenticated visitor.
    return json(req, {
      found: true,
      patient: { id: patient.id },
    });
  } catch (error) {
    console.error("azaad-patient-lookup:", error);
    return json(req, { error: error instanceof Error ? error.message : "Server error" }, 500);
  }
});
