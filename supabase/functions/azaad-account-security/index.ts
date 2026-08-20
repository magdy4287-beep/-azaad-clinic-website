import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const authClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const normalizePhone = (value: string) => { let p = String(value || "").trim().replace(/[^\d+]/g, ""); if (p.startsWith("00")) p = `+${p.slice(2)}`; if (p.startsWith("01") && p.length === 11) p = `+20${p.slice(1)}`; return p; };
const getBearer = (req: Request) => { const h = req.headers.get("Authorization") || ""; return h.startsWith("Bearer ") ? h.slice(7) : ""; };
async function getActor(token: string) { if (!token) return null; const { data, error } = await authClient.auth.getUser(token); if (error || !data.user) return null; const { data: staff } = await adminClient.from("clinic_staff").select("id,auth_user_id,username,full_name,role,phone,active,account_status").eq("auth_user_id", data.user.id).maybeSingle(); if (!staff || staff.active === false || staff.account_status !== "active") return null; return { user: data.user, staff }; }
async function ownerOnly(token: string) { const actor = await getActor(token); return actor && String(actor.staff.role).toUpperCase() === "OWNER" ? actor : null; }
async function audit(staffId: string, actorId: string | null, action: string, reason?: string, metadata: Record<string, unknown> = {}) { await adminClient.from("clinic_account_security_audit").insert({ staff_id: staffId, actor_staff_id: actorId, action, reason: reason || null, metadata }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (!["POST", "PUT"].includes(req.method)) return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "request_otp") {
      const username = String(body?.username || "").trim().toLowerCase();
      const phone = normalizePhone(String(body?.phone || ""));
      if (!/^[a-z0-9._-]{3,40}$/.test(username) || phone.length < 10) return json({ error: "INVALID_RECOVERY_REQUEST" }, 400);
      const { data: staff } = await adminClient.from("clinic_staff").select("id,auth_user_id,username,phone,active,account_status").eq("username", username).maybeSingle();
      if (!staff || !staff.auth_user_id || staff.active === false || staff.account_status !== "active" || normalizePhone(staff.phone || "") !== phone) return json({ ok: true, message: "إذا كانت البيانات صحيحة فسيتم إرسال رمز التحقق." });
      const { data: authUser } = await adminClient.auth.admin.getUserById(staff.auth_user_id);
      if (!authUser.user?.phone || normalizePhone(authUser.user.phone) !== phone) return json({ error: "PHONE_NOT_BOUND_TO_AUTH" }, 409);
      const { error } = await authClient.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
      if (error) return json({ error: "OTP_SEND_FAILED" }, 502);
      await audit(staff.id, null, "password_reset_request", undefined, { channel: "sms" });
      return json({ ok: true, message: "تم إرسال رمز التحقق إلى رقم الهاتف المسجل." });
    }

    if (action === "verify_otp_set_password") {
      const username = String(body?.username || "").trim().toLowerCase();
      const phone = normalizePhone(String(body?.phone || ""));
      const token = String(body?.otp || "").trim();
      const password = String(body?.password || "");
      if (!username || !phone || !/^\d{4,8}$/.test(token) || password.length < 10) return json({ error: "INVALID_RECOVERY_REQUEST" }, 400);
      const { data: staff } = await adminClient.from("clinic_staff").select("id,auth_user_id,username,phone,active,account_status").eq("username", username).maybeSingle();
      if (!staff || !staff.auth_user_id || staff.active === false || staff.account_status !== "active" || normalizePhone(staff.phone || "") !== phone) return json({ error: "RECOVERY_NOT_ALLOWED" }, 403);
      const { data: authUser } = await adminClient.auth.admin.getUserById(staff.auth_user_id);
      if (!authUser.user?.phone || normalizePhone(authUser.user.phone) !== phone) return json({ error: "PHONE_NOT_BOUND_TO_AUTH" }, 409);
      const { data: verified, error: verifyError } = await authClient.auth.verifyOtp({ phone, token, type: "sms" });
      if (verifyError || !verified.user) return json({ error: "OTP_INVALID_OR_EXPIRED" }, 401);
      if (verified.user.id !== staff.auth_user_id) return json({ error: "IDENTITY_MISMATCH" }, 403);
      const { error: updateError } = await adminClient.auth.admin.updateUserById(staff.auth_user_id, { password, user_metadata: { password_changed_at: new Date().toISOString() } });
      if (updateError) return json({ error: "PASSWORD_UPDATE_FAILED" }, 502);
      await audit(staff.id, null, "password_changed", "verified_sms_otp", { recovery: true });
      return json({ ok: true, message: "تم تغيير كلمة المرور بنجاح." });
    }

    const actor = await ownerOnly(getBearer(req));
    if (!actor) return json({ error: "OWNER_ONLY" }, 403);
    const staffId = String(body?.staff_id || "");
    if (!staffId) return json({ error: "STAFF_ID_REQUIRED" }, 400);
    const { data: target } = await adminClient.from("clinic_staff").select("id,auth_user_id,username,role,active,account_status").eq("id", staffId).maybeSingle();
    if (!target) return json({ error: "STAFF_NOT_FOUND" }, 404);
    if (target.id === actor.staff.id && ["suspend", "disable", "archive"].includes(action)) return json({ error: "CANNOT_DISABLE_SELF" }, 409);

    if (["suspend", "disable", "reactivate", "archive"].includes(action)) {
      if (String(target.role).toUpperCase() === "OWNER" && ["suspend", "disable", "archive"].includes(action)) {
        const { count } = await adminClient.from("clinic_staff").select("id", { count: "exact", head: true }).eq("role", "OWNER").eq("active", true).eq("account_status", "active");
        if ((count || 0) <= 1) return json({ error: "LAST_OWNER_PROTECTED" }, 409);
      }
      const status = action === "suspend" ? "suspended" : action === "disable" ? "disabled" : action === "archive" ? "archived" : "active";
      const update = await adminClient.from("clinic_staff").update({ account_status: status, active: status === "active", account_status_changed_at: new Date().toISOString(), account_status_changed_by: actor.staff.id, terminated_at: ["disabled", "archived"].includes(status) ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", staffId).select("id,username,full_name,role,phone,active,account_status").single();
      if (update.error) return json({ error: "ACCOUNT_STATUS_UPDATE_FAILED" }, 502);
      if (target.auth_user_id) { const authUpdate = await adminClient.auth.admin.updateUserById(target.auth_user_id, { ban_duration: status === "active" ? "none" : "876000h" }); if (authUpdate.error) return json({ error: "AUTH_STATUS_UPDATE_FAILED" }, 502); }
      await audit(target.id, actor.staff.id, action, String(body?.reason || ""), { previous_status: target.account_status, new_status: status });
      return json({ ok: true, staff: update.data });
    }

    if (action === "revoke_sessions") {
      if (!target.auth_user_id) return json({ error: "AUTH_IDENTITY_MISSING" }, 409);
      const { error } = await adminClient.auth.admin.signOut(target.auth_user_id, "global");
      if (error) return json({ error: "SESSION_REVOKE_FAILED" }, 502);
      await audit(target.id, actor.staff.id, "session_revoke", String(body?.reason || ""));
      return json({ ok: true });
    }

    if (action === "change_username") {
      const username = String(body?.username || "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,40}$/.test(username)) return json({ error: "INVALID_USERNAME" }, 400);
      const { data: conflict } = await adminClient.from("clinic_staff").select("id").eq("username", username).neq("id", target.id).maybeSingle();
      if (conflict) return json({ error: "USERNAME_ALREADY_EXISTS" }, 409);
      const { error } = await adminClient.from("clinic_staff").update({ username, updated_at: new Date().toISOString() }).eq("id", target.id);
      if (error) return json({ error: "USERNAME_UPDATE_FAILED" }, 502);
      await audit(target.id, actor.staff.id, "username_change", String(body?.reason || ""), { username });
      return json({ ok: true, username });
    }
    return json({ error: "UNKNOWN_ACTION" }, 400);
  } catch (_) { return json({ error: "SECURITY_OPERATION_FAILED" }, 500); }
});
