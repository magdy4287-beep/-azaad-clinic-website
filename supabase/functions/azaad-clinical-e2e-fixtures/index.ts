import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!bearer) return json({ error: "unauthorized" }, 401);

  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!base || !serviceKey) return json({ error: "server_configuration_error" }, 500);

  const userResponse = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${bearer}` },
  });
  if (!userResponse.ok) return json({ error: "unauthorized" }, 401);
  const user = await userResponse.json();
  const userId = String(user?.id || "").trim();
  if (!userId) return json({ error: "unauthorized" }, 401);

  const staffResponse = await fetch(
    `${base}/rest/v1/clinic_staff?select=id,role,active&auth_user_id=eq.${encodeURIComponent(userId)}&active=eq.true&limit=1`,
    { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } },
  );
  if (!staffResponse.ok) return json({ error: "staff_lookup_unavailable" }, 503);
  const staffRows = await staffResponse.json();
  const staff = Array.isArray(staffRows) ? staffRows[0] : null;
  const role = String(staff?.role || "").toUpperCase();
  if (!staff || !["OWNER", "ADMIN", "SECRETARY", "RECEPTION", "RECEPTIONIST", "CASHIER"].includes(role)) {
    return json({ error: "e2e_fixture_not_authorized" }, 403);
  }

  const rpcResponse = await fetch(`${base}/rest/v1/rpc/clinic_prepare_controlled_clinical_e2e_suite`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${bearer}`,
      "content-type": "application/json",
    },
    body: "{}",
  });
  const raw = await rpcResponse.text();
  if (!rpcResponse.ok) return json({ error: "fixture_factory_failed", detail: raw }, rpcResponse.status);

  let data: unknown;
  try { data = JSON.parse(raw); } catch { data = raw; }
  return json(data);
});
