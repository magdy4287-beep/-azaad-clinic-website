import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const OWNER_ROLE = 'OWNER';
const STAFF_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER', 'SECRETARY', 'RECEPTION', 'CASHIER', 'DOCTOR', 'MARKETING']);

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}
function cookieValue(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
async function appwriteRequest(path, options = {}) {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
  const apiKey = String(process.env.APPWRITE_API_KEY || '').trim();
  if (!endpoint || !project || !apiKey) throw new Error('APPWRITE_RUNTIME_NOT_CONFIGURED');
  return fetch(`${endpoint}${path}`, { ...options, headers: { 'X-Appwrite-Project': project, 'X-Appwrite-Key': apiKey, accept: 'application/json', ...(options.headers || {}) } });
}
async function appwriteAccount(secret) {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
  if (!endpoint || !project || !secret) return null;
  const cookie = `a_session_${project}=${secret}; a_session_${project}_legacy=${secret}`;
  const response = await fetch(`${endpoint}/account`, { headers: { 'X-Appwrite-Project': project, accept: 'application/json', Cookie: cookie } });
  return response.ok ? response.json() : null;
}
async function authorizeOwner(req) {
  const secret = cookieValue(req);
  const user = await appwriteAccount(secret);
  if (!user?.$id) return null;
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_RUNTIME_NOT_CONFIGURED');
  const sql = neon(databaseUrl);
  const rows = await sql`
    select id, auth_user_id, full_name, username, email, phone, role, active, account_status
    from public.clinic_staff where auth_user_id = ${user.$id} and active = true limit 1
  `;
  const staff = rows[0];
  if (!staff || String(staff.role || '').toUpperCase() !== OWNER_ROLE || staff.account_status === 'disabled' || staff.account_status === 'archived') return null;
  return { user, staff, sql };
}
function cleanRole(value) {
  const role = String(value || '').trim().toUpperCase();
  return STAFF_ROLES.has(role) ? role : null;
}
async function audit(sql, actorId, targetId, action, beforeData = null, afterData = null, reason = null) {
  try {
    await sql`
      insert into public.clinic_audit_log(actor_staff_id, action, entity_type, entity_id, before_data, after_data)
      values (${actorId}, ${action}, 'clinic_staff', ${String(targetId)}, ${JSON.stringify({ reason, ...beforeData })}::jsonb, ${JSON.stringify(afterData || {})}::jsonb)
    `;
  } catch (error) {
    console.warn('staff-admin audit write skipped', { action, reason: error?.message });
  }
}
async function updateAppwriteUserStatus(userId, enabled) {
  const response = await appwriteRequest(`/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: enabled }),
  });
  return response.ok;
}
async function createUser(staff, sql, res) {
  const email = String(staff.email || '').trim().toLowerCase();
  const password = String(staff.password || '');
  if (!email || !password || password.length < 8) return json(res, { error: 'valid_email_and_password_required' }, 400);
  const role = cleanRole(staff.role);
  if (!role) return json(res, { error: 'invalid_role' }, 400);
  const response = await appwriteRequest('/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: 'unique()', email, password, name: String(staff.full_name || '').trim() || email }) });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    return json(res, { error: detail?.message || detail?.type || 'appwrite_user_create_failed' }, response.status >= 400 && response.status < 500 ? response.status : 503);
  }
  const user = await response.json();
  try {
    const rows = await sql`insert into public.clinic_staff (auth_user_id, full_name, username, email, phone, role, active, account_status) values (${user.$id}, ${String(staff.full_name || '').trim()}, ${String(staff.username || '').trim().toLowerCase()}, ${email}, ${String(staff.phone || '').trim() || null}, ${role}, true, 'active') returning id, auth_user_id, full_name, username, email, phone, role, active, account_status`;
    return json(res, { staff: rows[0], provider: 'appwrite-neon' }, 201);
  } catch (error) {
    await appwriteRequest(`/users/${encodeURIComponent(user.$id)}`, { method: 'DELETE' }).catch(() => {});
    throw error;
  }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'method_not_allowed' }, 405);
  try {
    const identity = await authorizeOwner(req);
    if (!identity) return json(res, { error: 'owner_only' }, 403);
    const body = await readJson(req);
    const action = String(body.action || '').trim();
    const sql = identity.sql;
    if (action === 'list') {
      const rows = await sql`select id, auth_user_id, full_name, username, email, phone, role, active, account_status from public.clinic_staff order by lower(coalesce(full_name, username, email, '')) asc`;
      return json(res, { staff: rows, provider: 'appwrite-neon' });
    }
    if (action === 'create') return createUser(body, sql, res);
    if (action === 'request_phone_otp') {
      const username = String(body.username || '').trim().toLowerCase();
      const phone = String(body.phone || '').trim();
      if (!username || !phone) return json(res, { error: 'invalid_recovery_request' }, 400);
      const rows = await sql`select id, auth_user_id, username, phone, active, account_status from public.clinic_staff where lower(username)=${username} limit 1`;
      const target = rows[0];
      if (!target?.auth_user_id || target.active !== true || target.account_status !== 'active' || String(target.phone || '') !== phone) return json(res, { ok: true, message: 'إذا كانت البيانات صحيحة فسيتم إرسال رمز التحقق.' });
      const userResponse = await appwriteRequest(`/users/${encodeURIComponent(target.auth_user_id)}`);
      const appwriteUser = userResponse.ok ? await userResponse.json() : null;
      if (!appwriteUser?.$id || String(appwriteUser.phone || '') !== phone) return json(res, { error: 'phone_not_bound_to_auth' }, 409);
      const tokenResponse = await fetch(`${String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '')}/account/tokens/phone`, {
        method: 'POST', headers: { 'X-Appwrite-Project': String(process.env.APPWRITE_PROJECT_ID || '').trim(), 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ userId: appwriteUser.$id, phone }),
      });
      if (!tokenResponse.ok) return json(res, { error: 'otp_send_failed' }, 502);
      await audit(sql, target.id, target.id, 'PASSWORD_RESET_REQUEST', null, { channel: 'sms' }, 'phone_otp');
      return json(res, { ok: true, message: 'تم إرسال رمز التحقق إلى رقم الهاتف المسجل.' });
    }
    if (action === 'verify_phone_otp') {
      const username = String(body.username || '').trim().toLowerCase();
      const phone = String(body.phone || '').trim();
      const secret = String(body.otp || '').trim();
      const password = String(body.password || '');
      if (!username || !phone || !secret || password.length < 12) return json(res, { error: 'invalid_recovery_request' }, 400);
      const rows = await sql`select id, auth_user_id, username, phone, active, account_status from public.clinic_staff where lower(username)=${username} limit 1`;
      const target = rows[0];
      if (!target?.auth_user_id || target.active !== true || target.account_status !== 'active' || String(target.phone || '') !== phone) return json(res, { error: 'recovery_not_allowed' }, 403);
      const userResponse = await appwriteRequest(`/users/${encodeURIComponent(target.auth_user_id)}`);
      const appwriteUser = userResponse.ok ? await userResponse.json() : null;
      if (!appwriteUser?.$id || String(appwriteUser.phone || '') !== phone) return json(res, { error: 'phone_not_bound_to_auth' }, 409);
      const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
      const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
      const sessionResponse = await fetch(`${endpoint}/account/sessions/phone`, { method: 'PUT', headers: { 'X-Appwrite-Project': project, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ userId: appwriteUser.$id, secret }) });
      if (!sessionResponse.ok) return json(res, { error: 'otp_invalid_or_expired' }, 401);
      const passwordResponse = await appwriteRequest(`/users/${encodeURIComponent(target.auth_user_id)}/password`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      await fetch(`${endpoint}/users/${encodeURIComponent(target.auth_user_id)}/sessions`, { method: 'DELETE', headers: { 'X-Appwrite-Project': project, 'X-Appwrite-Key': String(process.env.APPWRITE_API_KEY || '').trim(), accept: 'application/json' } }).catch(() => {});
      if (!passwordResponse.ok) return json(res, { error: 'password_update_failed' }, 502);
      await audit(sql, target.id, target.id, 'PASSWORD_CHANGED', null, { recovery: true }, 'verified_phone_otp');
      return json(res, { ok: true, message: 'تم تغيير كلمة المرور بنجاح.' });
    }
    const staffId = String(body.staff_id || '').trim();
    if (!staffId) return json(res, { error: 'staff_id_required' }, 400);
    const rows = await sql`select id, auth_user_id, full_name, username, email, phone, role, active, account_status from public.clinic_staff where id::text=${staffId} limit 1`;
    const target = rows[0];
    if (!target) return json(res, { error: 'staff_not_found' }, 404);
    if (target.id === identity.staff.id && ['suspend', 'disable', 'archive'].includes(action)) return json(res, { error: 'cannot_disable_self' }, 409);
    if (['suspend', 'disable', 'reactivate', 'archive'].includes(action)) {
      if (String(target.role).toUpperCase() === OWNER_ROLE && ['suspend', 'disable', 'archive'].includes(action)) {
        const ownerRows = await sql`select count(*)::int as count from public.clinic_staff where upper(role)='OWNER' and active=true and account_status='active'`;
        if (Number(ownerRows[0]?.count || 0) <= 1) return json(res, { error: 'last_owner_protected' }, 409);
      }
      const status = action === 'suspend' ? 'suspended' : action === 'disable' ? 'disabled' : action === 'archive' ? 'archived' : 'active';
      const active = status === 'active';
      const updated = await sql`update public.clinic_staff set account_status=${status}, active=${active}, account_status_changed_at=now(), account_status_changed_by=${identity.staff.id}, terminated_at=${['disabled','archived'].includes(status) ? new Date().toISOString() : null}, updated_at=now() where id::text=${staffId} returning id, auth_user_id, full_name, username, email, phone, role, active, account_status`;
      if (!updated[0]) return json(res, { error: 'account_status_update_failed' }, 502);
      if (target.auth_user_id && !(await updateAppwriteUserStatus(target.auth_user_id, active))) return json(res, { error: 'auth_status_update_failed' }, 502);
      await audit(sql, identity.staff.id, target.id, action.toUpperCase(), target, updated[0], String(body.reason || ''));
      return json(res, { ok: true, staff: updated[0], provider: 'appwrite-neon' });
    }
    if (action === 'revoke_sessions') {
      if (!target.auth_user_id) return json(res, { error: 'auth_identity_missing' }, 409);
      const response = await appwriteRequest(`/users/${encodeURIComponent(target.auth_user_id)}/sessions`, { method: 'DELETE' });
      if (!response.ok) return json(res, { error: 'session_revoke_failed' }, 502);
      await audit(sql, identity.staff.id, target.id, 'SESSION_REVOKE', target, null, String(body.reason || ''));
      return json(res, { ok: true, provider: 'appwrite' });
    }
    if (action === 'change_username') {
      const username = String(body.username || '').trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,40}$/.test(username)) return json(res, { error: 'invalid_username' }, 400);
      const conflict = await sql`select id from public.clinic_staff where lower(username)=${username} and id::text<>${target.id} limit 1`;
      if (conflict[0]) return json(res, { error: 'username_already_exists' }, 409);
      const updated = await sql`update public.clinic_staff set username=${username}, updated_at=now() where id::text=${target.id} returning id, username, full_name, role, phone, active, account_status`;
      if (!updated[0]) return json(res, { error: 'username_update_failed' }, 502);
      await audit(sql, identity.staff.id, target.id, 'USERNAME_CHANGE', target, updated[0], String(body.reason || ''));
      return json(res, { ok: true, username, provider: 'neon' });
    }
    if (action === 'reset_password') {
      const password = String(body.password || '');
      if (password.length < 12 || password.length > 256) return json(res, { error: 'invalid_password' }, 400);
      if (!target.auth_user_id) return json(res, { error: 'auth_identity_missing' }, 409);
      const response = await appwriteRequest(`/users/${encodeURIComponent(target.auth_user_id)}/password`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!response.ok) return json(res, { error: 'password_reset_failed' }, 502);
      await audit(sql, identity.staff.id, target.id, 'PASSWORD_RESET', target, null, String(body.reason || ''));
      return json(res, { ok: true, provider: 'appwrite' });
    }
    return json(res, { error: 'unsupported_action' }, 400);
  } catch (error) {
    console.error('staff-admin boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'staff_admin_unavailable' }, 503);
  }
}
