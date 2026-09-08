import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const SESSION_MAX_AGE = 60 * 60 * 8;

function json(res, body, status = 200, headers = {}) {
  res.status(status);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  return res.json(body);
}

function corsHeaders(origin) {
  const allowed = new Set(['https://azaad-clinic-website.vercel.app', 'https://azaad-clinic-website-magdy-team.vercel.app']);
  return origin && allowed.has(origin) ? { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', vary: 'Origin' } : {};
}

function headerValue(request, name) {
  const headers = request?.headers;
  if (!headers) return '';
  if (typeof headers.get === 'function') return String(headers.get(name) || '');
  const wanted = String(name).toLowerCase();
  if (typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      if (String(key).toLowerCase() === wanted) return Array.isArray(value) ? String(value[0] || '') : String(value || '');
    }
  }
  return '';
}

async function bodyValue(request) {
  const parser = request?.json;
  if (typeof parser === 'function') {
    const value = await parser.call(request);
    return value && typeof value === 'object' ? value : {};
  }
  const body = request?.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  if (typeof body === 'string') {
    try {
      const value = JSON.parse(body);
      return value && typeof value === 'object' ? value : {};
    } catch (_) {
      return {};
    }
  }
  return {};
}

function cookieValue(request) {
  const raw = headerValue(request, 'cookie');
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function sessionCookie(request, value, maxAge = SESSION_MAX_AGE) {
  const forwardedProtocol = headerValue(request, 'x-forwarded-proto').split(',')[0].trim().toLowerCase();
  const host = headerValue(request, 'host').split(',')[0].trim().toLowerCase();
  const localHost = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/.test(host);
  const secure = forwardedProtocol === 'https' || (!localHost && process.env.NODE_ENV === 'production');
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax`;
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
    console.warn('admin-auth Appwrite session verification rejected', { status: response.status, cookiePresent: true, cookieLength: secret.length });
    return null;
  }
  return response.json();
}

async function resolveStaff(username) {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_RUNTIME_NOT_CONFIGURED');
  const sql = neon(databaseUrl);
  const rows = await sql`
    select id, auth_user_id, full_name, username, email, phone, role, active
    from public.clinic_staff
    where active = true and (lower(username) = lower(${username}) or lower(email) = lower(${username}))
    order by case when lower(username) = lower(${username}) then 0 else 1 end
    limit 1
  `;
  return rows[0] || null;
}

async function databaseFingerprint() {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) return { configured: false };
  try {
    const sql = neon(databaseUrl);
    const rows = await sql`select current_database() as db, current_schema() as schema, to_regclass('public.clinic_staff') as clinic_staff_table`;
    const row = rows[0] || {};
    return { configured: true, db: row.db || null, schema: row.schema || null, clinicStaffTable: Boolean(row.clinic_staff_table) };
  } catch (_) {
    return { configured: true, queryOk: false };
  }
}

async function createSession(username, password) {
  const staff = await resolveStaff(username);
  if (!staff?.email) {
    console.warn('admin-auth login rejected before Appwrite session creation', { stage: 'staff_lookup', staffFound: Boolean(staff), emailPresent: Boolean(staff?.email), database: await databaseFingerprint() });
    return null;
  }
  const response = await appwriteRequest('/account/sessions/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: staff.email, password }) });
  if (!response.ok) {
    console.warn('admin-auth login rejected by Appwrite session creation', { stage: 'appwrite_session_create', status: response.status });
    return null;
  }
  const session = await response.json();
  const parity = Boolean(session?.userId && staff.auth_user_id && session.userId === staff.auth_user_id);
  if (!session?.userId || !session?.secret || !parity) {
    console.warn('admin-auth login rejected session contract', { stage: 'session_contract', userIdPresent: Boolean(session?.userId), secretPresent: Boolean(session?.secret), parity });
    if (session?.secret) await appwriteRequest(`/account/sessions/${encodeURIComponent(session.$id || 'current')}`, { method: 'DELETE' }).catch(() => {});
    return null;
  }
  return { appwriteSecret: session.secret, staff, session };
}

async function verifySession(request) {
  const secret = cookieValue(request);
  const user = await appwriteAccount(secret);
  if (!user?.$id) return null;
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) return null;
  const sql = neon(databaseUrl);
  const rows = await sql`
    select id, auth_user_id, full_name, username, email, phone, role, active
    from public.clinic_staff where auth_user_id = ${user.$id} and active = true limit 1
  `;
  const staff = rows[0] || null;
  return staff ? { user, staff } : null;
}

export default async function handler(req, res) {
  const cors = corsHeaders(headerValue(req, 'origin'));
  for (const [key, value] of Object.entries(cors)) res.setHeader(key, value);
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
      res.setHeader('access-control-allow-headers', 'content-type');
      return res.status(204).end();
    }
    if (req.method === 'POST') {
      const body = await bodyValue(req);
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!username || !password) return json(res, { error: 'credentials_required' }, 400);
      const result = await createSession(username, password);
      if (!result) return json(res, { error: 'invalid_credentials' }, 401);
      const { appwriteSecret, staff, session } = result;
      return json(res, { authenticated: true, provider: 'appwrite', user: { id: session.userId, email: staff.email }, staff }, 200, { 'set-cookie': sessionCookie(req, appwriteSecret) });
    }
    if (req.method === 'DELETE') {
      const secret = cookieValue(req);
      if (secret) {
        const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
        const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
        if (project && endpoint) await fetch(`${endpoint}/account/sessions/current`, { method: 'DELETE', headers: { 'X-Appwrite-Project': project, accept: 'application/json', Cookie: `a_session_${project}=${secret}; a_session_${project}_legacy=${secret}` } }).catch(() => {});
      }
      return json(res, { ok: true }, 200, { 'set-cookie': sessionCookie(req, '', 0) });
    }
    if (req.method === 'GET') {
      const identity = await verifySession(req);
      if (!identity) return json(res, { authenticated: false }, 401);
      return json(res, { authenticated: true, provider: 'appwrite', user: { id: identity.user.$id, email: identity.user.email }, staff: identity.staff });
    }
    return json(res, { error: 'method_not_allowed' }, 405);
  } catch (error) {
    console.error('admin-auth boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'admin_auth_unavailable' }, 503);
  }
}
