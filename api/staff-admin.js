import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const ALLOWED_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER']);
const STAFF_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER', 'SECRETARY', 'RECEPTION', 'CASHIER', 'DOCTOR', 'MARKETING']);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function cookieValue(request) {
  const raw = request.headers.get('cookie') || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
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
  const response = await fetch(`${endpoint}/account`, { headers: { 'X-Appwrite-Project': project, accept: 'application/json', Cookie: `a_session_${project}=${secret}` } });
  if (!response.ok) return null;
  return response.json();
}
async function authorize(request) {
  const secret = request.headers.get('x-azaad-appwrite-session') || cookieValue(request);
  const user = await appwriteAccount(secret);
  if (!user?.$id) return null;
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_RUNTIME_NOT_CONFIGURED');
  const sql = neon(databaseUrl);
  const rows = await sql`
    select id, auth_user_id, full_name, username, email, phone, role, active
    from public.clinic_staff where auth_user_id = ${user.$id} and active = true limit 1
  `;
  const staff = rows[0];
  if (!staff) return null;
  const role = String(staff.role || '').toUpperCase();
  if (!ALLOWED_ROLES.has(role)) return null;
  return { user, staff, role, sql };
}
function cleanRole(value) {
  const role = String(value || '').trim().toUpperCase();
  return STAFF_ROLES.has(role) ? role : null;
}
async function createUser(staff, sql) {
  const email = String(staff.email || '').trim().toLowerCase();
  const password = String(staff.password || '');
  if (!email || !password || password.length < 8) return json({ error: 'valid_email_and_password_required' }, 400);
  const role = cleanRole(staff.role);
  if (!role) return json({ error: 'invalid_role' }, 400);
  const response = await appwriteRequest('/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: 'unique()', email, password, name: String(staff.full_name || '').trim() || email }) });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    return json({ error: detail?.message || detail?.type || 'appwrite_user_create_failed' }, response.status >= 400 && response.status < 500 ? response.status : 503);
  }
  const user = await response.json();
  try {
    const rows = await sql`insert into public.clinic_staff (auth_user_id, full_name, username, email, phone, role, active) values (${user.$id}, ${String(staff.full_name || '').trim()}, ${String(staff.username || '').trim().toLowerCase()}, ${email}, ${String(staff.phone || '').trim() || null}, ${role}, true) returning id, auth_user_id, full_name, username, email, phone, role, active`;
    return json({ staff: rows[0], provider: 'appwrite-neon' }, 201);
  } catch (error) {
    await appwriteRequest(`/users/${encodeURIComponent(user.$id)}`, { method: 'DELETE' }).catch(() => {});
    throw error;
  }
}
export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const identity = await authorize(request);
    if (!identity) return json({ error: 'authentication_required' }, 401);
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    const sql = identity.sql;
    if (action === 'list') {
      const rows = await sql`select id, auth_user_id, full_name, username, email, phone, role, active from public.clinic_staff order by lower(coalesce(full_name, username, email, '')) asc`;
      return json({ staff: rows, provider: 'appwrite-neon' });
    }
    if (action === 'create') return createUser(body, sql);
    const staffId = String(body.staff_id || '').trim();
    if (!staffId) return json({ error: 'staff_id_required' }, 400);
    if (action === 'update_role') {
      const role = cleanRole(body.role);
      if (!role) return json({ error: 'invalid_role' }, 400);
      const rows = await sql`update public.clinic_staff set role = ${role} where id::text = ${staffId} returning id, auth_user_id, full_name, username, email, phone, role, active`;
      if (!rows[0]) return json({ error: 'staff_not_found' }, 404);
      return json({ staff: rows[0], provider: 'appwrite-neon' });
    }
    if (action === 'enable' || action === 'disable') {
      const active = action === 'enable';
      const rows = await sql`update public.clinic_staff set active = ${active} where id::text = ${staffId} returning id, auth_user_id, full_name, username, email, phone, role, active`;
      if (!rows[0]) return json({ error: 'staff_not_found' }, 404);
      return json({ staff: rows[0], provider: 'appwrite-neon' });
    }
    if (action === 'reset_password') {
      const password = String(body.password || '');
      if (password.length < 8) return json({ error: 'password_min_length_8' }, 400);
      const rows = await sql`select auth_user_id from public.clinic_staff where id::text = ${staffId} limit 1`;
      const authUserId = rows[0]?.auth_user_id;
      if (!authUserId) return json({ error: 'staff_not_found' }, 404);
      const response = await appwriteRequest(`/users/${encodeURIComponent(authUserId)}/password`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        return json({ error: detail?.message || detail?.type || 'password_reset_failed' }, response.status >= 400 && response.status < 500 ? response.status : 503);
      }
      return json({ ok: true, provider: 'appwrite-neon' });
    }
    return json({ error: 'unsupported_action' }, 400);
  } catch (error) {
    console.error('staff-admin boundary failure', { name: error?.name, message: error?.message });
    return json({ error: 'staff_admin_unavailable' }, 503);
  }
}