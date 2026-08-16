import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401);
  const url = Deno.env.get("SUPABASE_URL"); const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return json({ error: "server_configuration_error" }, 500);
  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: "authentication_required" }, 401);
  let body: Record<string, unknown>; try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const bookingId = String(body.booking_id ?? "").trim(); if (!bookingId) return json({ error: "booking_id_required" }, 400);
  const { data, error } = await supabase.rpc("clinic_frontdesk_checkin", { p_booking_id: bookingId, p_notes: body.notes ?? null });
  if (error) { const message = String(error.message ?? "checkin_failed"); const status = /NOT_AUTHORIZED|permission_denied/i.test(message) ? 403 : /NOT_FOUND/i.test(message) ? 404 : 409; return json({ error: message }, status); }
  return json({ ok: true, data });
});
