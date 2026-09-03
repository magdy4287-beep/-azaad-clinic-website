import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

Deno.serve(async (req: Request) => {
  // Controlled clinical fixture provisioning is intentionally fail-closed here.
  // The canonical production runtime is Neon + Appwrite; this legacy Supabase
  // function must never manufacture fixtures against a different data plane.
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  return json({
    error: "clinical_fixture_boundary_not_canonical",
    code: "CLINICAL_FIXTURE_NEON_APPWRITE_REQUIRED",
    detail: "Controlled clinical fixtures must be provisioned through the canonical Neon/Appwrite boundary; the legacy Supabase fixture path is disabled.",
  }, 503);
});
