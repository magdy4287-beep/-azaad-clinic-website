import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,apikey,content-type", "Access-Control-Allow-Methods": "GET,OPTIONS", "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
const role = (v: unknown) => String(v ?? "").toUpperCase();

async function actor(req: Request) {
  const h = req.headers.get("authorization") || "";
  if (!h.startsWith("Bearer ")) return null;
  const token = h.slice(7);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: staff } = await db.from("clinic_staff").select("id,auth_user_id,full_name,role,active,account_status").eq("auth_user_id", data.user.id).eq("active", true).maybeSingle();
  if (!staff || staff.account_status !== "active" || !["OWNER", "ADMIN", "MANAGER"].includes(role(staff.role))) return null;
  return staff;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const staff = await actor(req);
  if (!staff) return json({ error: "Unauthorized" }, 401);

  const u = new URL(req.url);
  const limit = Math.min(Math.max(Number(u.searchParams.get("limit") || 100), 1), 500);
  try {
    const [auditLog, accountAudit, securityEvents] = await Promise.all([
      db.from("clinic_audit_log").select("id,actor_staff_id,action,entity_type,entity_id,before_data,after_data,ip_address,user_agent,created_at").order("created_at", { ascending: false }).limit(limit),
      db.from("clinic_account_security_audit").select("*").order("created_at", { ascending: false }).limit(limit),
      db.from("clinic_security_events").select("*").order("created_at", { ascending: false }).limit(limit)
    ]);

    const results = [auditLog, accountAudit, securityEvents];
    for (const r of results) if (r.error) {
      if (r.error.message.includes("clinic_security_events")) continue;
      return json({ error: r.error.message }, 500);
    }

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      actor: { id: staff.id, role: role(staff.role) },
      counts: {
        audit_events: (auditLog.data || []).length,
        account_security_events: (accountAudit.data || []).length,
        security_events: securityEvents.error ? 0 : (securityEvents.data || []).length
      },
      audit_events: auditLog.data || [],
      account_security_events: accountAudit.data || [],
      security_events: securityEvents.error ? [] : (securityEvents.data || [])
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Security center failed" }, 500);
  }
});
