import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const ALLOWED_ORIGINS = new Set([
  "https://azaad-clinic-website.vercel.app",
  "https://azaad-clinic-website-magdy-team.vercel.app",
  "https://azaad-clinic-website-git-main-magdy-team.vercel.app",
  "https://magdy4287-beep.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173"
]);

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors(req) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "GET") return json(req, { error: "method_not_allowed" }, 405);

  try {
    const [settings, doctors, services, posts] = await Promise.all([
      db.from("clinic_settings").select("id,clinic_name,tagline,phone,landline,email,address,whatsapp,facebook_url,linkedin_url,instagram_url,tiktok_url,logo_url,hero_image_url,slot_minutes,booking_notice").limit(1).maybeSingle(),
      db.from("clinic_doctors").select("id,name,title,bio,image_url,services,active,sort_order,name_en,title_en,bio_en").eq("active", true).order("sort_order"),
      db.from("clinic_services").select("id,name,description,duration_minutes,price,active,sort_order,name_en,description_en").eq("active", true).order("sort_order"),
      db.from("clinic_posts").select("id,title,content,media_type,media_url,external_url,published,published_at,sort_order,title_en,content_en").eq("published", true).order("sort_order").order("published_at", { ascending: false })
    ]);

    const error = settings.error || doctors.error || services.error || posts.error;
    if (error) {
      console.error("azaad-public-clinic-data query error", error.message);
      return json(req, { error: "clinic_data_unavailable" }, 503);
    }

    return json(req, {
      settings: settings.data || {},
      doctors: doctors.data || [],
      services: services.data || [],
      posts: posts.data || []
    });
  } catch (error) {
    console.error("azaad-public-clinic-data error", error);
    return json(req, { error: "clinic_data_unavailable" }, 503);
  }
});
