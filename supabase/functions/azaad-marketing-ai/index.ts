import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const C = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,apikey", "Access-Control-Allow-Methods": "POST,OPTIONS" };
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...C, "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function actor(req: Request) {
  const h = req.headers.get("authorization") || "";
  if (!h.startsWith("Bearer ")) return null;
  const token = h.slice(7);
  const auth = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error } = await auth.auth.getUser();
  if (error || !userData.user) return null;
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: staff } = await db.from("clinic_staff").select("id,auth_user_id,role,department,active,account_status").eq("auth_user_id", userData.user.id).maybeSingle();
  if (!staff || staff.active !== true || staff.account_status !== "active") return null;
  const role = String(staff.role || "").toUpperCase();
  const department = String(staff.department || "").toUpperCase();
  const allowedRoles = ["OWNER", "ADMIN", "MANAGER", "MARKETING", "MARKETING_MANAGER", "SOCIAL_MEDIA"];
  if (!allowedRoles.includes(role) && department !== "MARKETING") return null;
  return { user: userData.user, staff, db };
}

function localDraft(topic: string, objective: string, language: "ar" | "en", platforms: string[]) {
  const ar = `${topic}\n\nفي Azaad Clinic نقدم محتوى توعويًا مهنيًا وإنسانيًا يحترم الخصوصية. ${objective || "تعرّف على خدماتنا وفريقنا واحجز موعدك من الموقع."}\n\n📅 احجز موعدك من الموقع.`;
  const en = `${topic}\n\nAzaad Clinic shares professional, human and privacy-respecting educational content. ${objective || "Explore our services and team and book an appointment from our website."}\n\n📅 Book your appointment from our website.`;
  return { caption: language === "en" ? en : ar, hashtags: ["AzaadClinic", "MentalHealth", "Psychotherapy", "MentalHealthCare", "BookAppointment"], provider: "local-free-fallback", platforms };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: C });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  const context = await actor(req);
  if (!context) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const topic = String(body.topic || "Azaad Clinic").slice(0, 300);
  const objective = String(body.objective || "").slice(0, 800);
  const platforms = Array.isArray(body.platforms) ? body.platforms.slice(0, 10).map(String) : [];
  const language: "ar" | "en" = body.language === "en" ? "en" : "ar";
  const key = Deno.env.get("GEMINI_API_KEY");

  // Core operation remains free even when no external AI credential exists.
  if (!key) return json(localDraft(topic, objective, language, platforms));

  const prompt = `You are Azaad Clinic's marketing copilot. Create one safe, professional social caption for a mental-health clinic. Never diagnose, promise outcomes, reveal patient information, or make unsupported medical claims. Keep it human and suitable for Facebook, Instagram, LinkedIn, TikTok and the clinic website. Return JSON only: {caption:string,hashtags:string[]}. Language: ${language}. Topic: ${topic}. Objective/context: ${objective}. Platforms: ${JSON.stringify(platforms)}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.5 } }) });
    if (!r.ok) return json(localDraft(topic, objective, language, platforms));
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = {}; }
    if (!parsed?.caption) return json(localDraft(topic, objective, language, platforms));
    return json({ caption: String(parsed.caption), hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String).slice(0, 20) : [], provider: "gemini-free-tier", platforms });
  } catch (_) {
    return json(localDraft(topic, objective, language, platforms));
  }
});
