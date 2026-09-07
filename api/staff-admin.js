import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const ALLOWED_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER']);
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
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
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
  if (!response.ok) {
    console.warn('staff-admin Appwrite session verification rejected', { stage: 'appwrite_account', status: response.status, cookiePresent: true, cookieLength: secret.length });
    return null;
  }
  return response.json();
}
async function authorize(req) {
  const secret = cookieValue(req);
  if (!secret) {
    console.warn('staff-admin authorization rejected', { stage: 'cookie', cookiePresent: false });
    return null;
  }
  const user = await appwriteAccount(secret);
  if (!user?.$id) {
    console.warn('staff-admin authorization rejected', { stage: 'appwrite_identity', userIdPresent: false });
    return null;
  }
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_RUNTIME_NOT_CONFIGURED');
  const sql = neon(databaseUrl);
  const rows = await sql`
    select id, auth_user_id, full_name, username, email, phone, role, active
    from public.clinic_staff where auth_user_id = ${user.$id} and active = true limit 1
  `;
  const staff = rows[0];
  if (!staff) {
    console.warn('staff-admin authorization rejected', { stage: 'staff_binding', userIdPresent: true, staffFound: false });
    return null;
  }
  const role = String(staff.role || '').toUpperCase();
  if (!ALLOWED_ROLES.has(role)) {
    console.warn('staff-admin authorization rejected', { stage: 'role', userIdPresent: true, staffFound: true, role });
    return null;
  }
  return { user, staff, role, sql };
}
function cleanRole(value) {
  const role = String(value || '').trim().toUpperCase();
  return STAFF_ROLES.has(role) ? role : null;
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
    const rows = await sql`insert into public.clinic_staff (auth_user_id, full_name, username, email, phone, role, active) values (${user.$id}, ${String(staff.full_name || '').trim()}, ${String(staff.username || '').trim().toLowerCase()}, ${email}, ${String(staff.phone || '').trim() || null}, ${role}, true) returning id, auth_user_id, full_name, username, email, phone, role, active`;
    return json(res, { staff: rows[0], provider: 'appwrite-neon' }, 201);
  } catch (error) {
    await appwriteRequest(`/users/${encodeURIComponent(user.$id)}`, { method: 'DELETE' }).catch(() => {});
    throw error;
  }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'method_not_allowed' }, 405);
  try {
    const identity = await authorize(req);
    if (!identity) return json(res, { error: 'authentication_required' }, 401);
    const body = await readJson(req);
    const action = String(body.action || '').trim();
    const sql = identity.sql;
    if (action === 'list') {
      const rows = await sql`select id, auth_user_id, full_name, username, email, phone, role, active from public.clinic_staff order by lower(coalesce(full_name, username, email, '')) asc`;
      return json(res, { staff: rows, provider: 'appwrite-neon' });
    }
    if (action === 'create') return createUser(body, sql, res);
    const staffId = String(body.staff_id || '').trim();
    if (!staffId) return json(res, { error: 'staff_id_required' }, 400);
    if (action === 'update_role') {
      const role = cleanRole(body.role);
      if (!role) return json(res, { error: 'invalid_role' }, 400);
      const rows = await sql`update public.clinic_staff set role = ${role} where id::text = ${staffId} returning id, auth_user_id, full_name, username, email, phone, role, active`;
      if (!rows[0]) return json(res, { error: 'staff_not_found' }, 404);
      return json(res, { staff: rows[0], provider: 'appwrite-neon' });
    }
    if (action === 'enable' || action === 'disable') {
      const active = action === 'enable';
      const rows = await sql`update public.clinic_staff set active = ${active} where id::text = ${staffId} returning id, auth_user_id, full_name, username, email, phone, role, active`;
      if (!rows[0]) return json(res, { error: 'staff_not_found' }, 404);
      return json(res, { staff: rows[0], provider: 'appwrite-neon' });
    }
    if (action === 'reset_password') {
      const password = String(body.password || '');
      if (password.length < 8) return json(res, { error: 'password_min_length_8' }, 400);
      const rows = await sql`select auth_user_id from public.clinic_staff where id::text = ${staffId} limit 1`;
      const authUserId = rows[0]?.auth_user_id;
      if (!authUserId) return json(res, { error: 'staff_not_found' }, 404);
      const response = await appwriteRequest(`/users/${encodeURIComponent(authUserId)}/password`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        return json(res, { error: detail?.message || detail?.type || 'password_reset_failed' }, response.status >= 400 && response.status < 500 ? response.status : 503);
      }
      return json(res, { ok: true, provider: 'appwrite-neon' });
    }
    return json(res, { error: 'unsupported_action' }, 400);
  } catch (error) {
    console.error('staff-admin boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'staff_admin_unavailable' }, 503);
  }
}