import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || "").trim();

function resolveKeyValue(raw: string, preferredPrefix: string): string {
  const value = raw.trim();
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "string") return parsed.trim();
    if (Array.isArray(parsed)) {
      const preferred = parsed.find((item) => typeof item === "string" && item.trim().startsWith(preferredPrefix));
      return (preferred || parsed.find((item) => typeof item === "string" && item.trim()) || "").trim();
    }
    if (parsed && typeof parsed === "object") {
      const values = Object.values(parsed).filter((item): item is string => typeof item === "string" && item.trim());
      const preferred = values.find((item) => item.trim().startsWith(preferredPrefix));
      if (preferred) return preferred.trim();
      for (const key of ["default", "current", "value"]) {
        const candidate = parsed[key];
        if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
      }
      return values[0]?.trim() || "";
    }
  } catch (_) {}
  return value;
}

function readKey(names: string[], preferredPrefix: string): string {
  for (const name of names) {
    const resolved = resolveKeyValue(Deno.env.get(name) || "", preferredPrefix);
    if (resolved) return resolved;
  }
  return "";
}

const SECRET_KEY = readKey(["SUPABASE_SECRET_KEYS", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"], "sb_secret_");
const PUBLISHABLE_KEY = readKey(["SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"], "sb_publishable_");

function dbHeaders() {
  const headers: Record<string, string> = { apikey: SECRET_KEY, Accept: "application/json" };
  if (!SECRET_KEY.startsWith("sb_secret_")) headers.Authorization = `Bearer ${SECRET_KEY}`;
  return headers;
}

const ORIGINS = new Set([
  "https://magdy4287-beep.github.io",
  "https://azaad-clinic-website.vercel.app",
  "https://azaad-clinic-website-magdy-team.vercel.app",
  "https://azaad-clinic-website-git-main-magdy-team.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4173",
]);

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://azaad-clinic-website.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function json(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(req ? cors(req) : {}),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function findStaff(username: string) {
  if (!SUPABASE_URL || !SECRET_KEY) throw new Error("STAFF_DB_CONFIGURATION_MISSING");
  const url = new URL(`${SUPABASE_URL}/rest/v1/clinic_staff`);
  url.searchParams.set("select", "id,auth_user_id,full_name,username,email,phone,role,active");
  url.searchParams.set("username", `eq.${username}`);
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers: dbHeaders() });
  const text = await response.text();
  if (!response.ok) {
    console.error("clinic_staff lookup failed", response.status, text.slice(0, 300));
    throw new Error(`STAFF_LOOKUP_HTTP_${response.status}`);
  }
  const rows = JSON.parse(text);
  return Array.isArray(rows) ? rows[0] || null : null;
}

const publicClient = SUPABASE_URL && PUBLISHABLE_KEY
  ? createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
  : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);
  try {
    if (!SUPABASE_URL || !SECRET_KEY || !PUBLISHABLE_KEY || !publicClient) {
      console.error("staff-login configuration incomplete", {
        hasUrl: Boolean(SUPABASE_URL),
        hasSecretKey: Boolean(SECRET_KEY),
        hasPublishableKey: Boolean(PUBLISHABLE_KEY),
      });
      return json({ error: "تسجيل الدخول غير متاح حاليًا.", code: "STAFF_LOGIN_CONFIGURATION" }, 503, req);
    }
    const body = await req.json();
    const username = String(body?.username || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!username || !password) return json({ error: "اسم المستخدم وكلمة المرور مطلوبان." }, 400, req);
    const staffProfile = await findStaff(username);
    if (!staffProfile) return json({ error: "بيانات الدخول غير صحيحة أو الحساب غير موجود." }, 401, req);
    if (!staffProfile.active) return json({ error: "الحساب غير فعال." }, 403, req);
    if (!staffProfile.email || !staffProfile.auth_user_id) return json({ error: "حساب الموظف غير مكتمل." }, 403, req);
    const { data: loginData, error: loginError } = await publicClient.auth.signInWithPassword({ email: staffProfile.email, password });
    if (loginError || !loginData.session) {
      console.error("auth sign-in failed", loginError?.message || "no session");
      return json({ error: "بيانات الدخول غير صحيحة.", code: "AUTH_SIGNIN_FAILED" }, 401, req);
    }
    return json({ success: true, user: loginData.user, session: loginData.session, staff: staffProfile }, 200, req);
  } catch (error) {
    console.error("staff-login failure", error instanceof Error ? error.message : String(error));
    return json({ error: "تعذر تجهيز تسجيل الدخول. حاول مرة أخرى.", code: "STAFF_LOGIN_FAILED" }, 500, req);
  }
});
