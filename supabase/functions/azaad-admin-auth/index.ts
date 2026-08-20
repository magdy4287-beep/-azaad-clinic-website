import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

const ALLOWED_ORIGINS = new Set([
  "https://magdy4287-beep.github.io",
  "https://azaad-clinic-website.vercel.app",
  "https://azaad-clinic-website-magdy-team.vercel.app",
  "https://azaad-clinic-website-git-main-magdy-team.vercel.app",
  "http://127.0.0.1:4173",
  "http://localhost:4173"
]);

const corsFor = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://azaad-clinic-website.vercel.app",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info,x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Vary": "Origin"
});

const json = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(origin), "Content-Type": "application/json", "Cache-Control": "no-store" }
  });

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(origin) });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405, origin);

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "جلسة الإدارة غير موجودة أو منتهية." }, 401, origin);
  const token = auth.slice(7).trim();
  if (!token) return json({ error: "جلسة الإدارة غير موجودة أو منتهية." }, 401, origin);

  try {
    const { data: { user }, error: userError } = await db.auth.getUser(token);
    if (userError || !user) return json({ error: "جلسة الإدارة غير صالحة أو منتهية.", code: "AUTH_TOKEN_INVALID" }, 401, origin);

    const { data: staff, error: staffError } = await db
      .from("clinic_staff")
      .select("id,auth_user_id,full_name,username,email,phone,role,active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (staffError) return json({ error: staffError.message, code: "STAFF_LOOKUP_FAILED" }, 500, origin);
    if (!staff || staff.active !== true) return json({ error: "حساب الموظف غير فعال أو غير موجود.", code: "STAFF_NOT_ACTIVE" }, 403, origin);

    return json({
      admin: { id: staff.id, username: staff.username, email: staff.email || "", phone: staff.phone || "", active: staff.active, role: staff.role, full_name: staff.full_name },
      user: { id: user.id, email: user.email || "" }
    }, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Server error", code: "AUTH_LOOKUP_FAILED" }, 500, origin);
  }
});