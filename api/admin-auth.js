import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const SESSION_MAX_AGE = 60 * 60 * 8;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}

function corsHeaders(origin) {
  const allowed = new Set(['https://azaad-clinic-website.vercel.app', 'https://azaad-clinic-website-magdy-team.vercel.app']);
  return origin && allowed.has(origin) ? { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', vary: 'Origin' } : {};
}

function cookieValue(request) {
  const raw = request.headers.get('cookie') || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function sessionCookie(request, value, maxAge = SESSION_MAX_AGE) {
  const protocol = new URL(request.url).protocol;
  const secure = protocol === 'https:';
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax`;
}

async function appwriteRequest(path, options = {}) {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\\/$/, '');
  const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
  const apiKey = String(process.env.APPWRITE_API_KEY || '').trim();
  if (!endpoint || !project || !apiKey) throw new Error('APPWRITE_RUNTIME_NOT_CONFIGURED');
  return fetch(`${endpoint}${path}`, { ...options, headers: { 'X-Appwrite-Project': project, 'X-Appwrite-Key': apiKey, accept: 'application/json', ...(options.headers || {}) } });
}

async function appwriteAccount(secret) {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\\/$/, '');
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

async function createSession(username, password) {
  const staff = await resolveStaff(username);
  if (!staff?.email) {
    console.warn('admin-auth login rejected before Appwrite session creation', { stage: 'staff_lookup', staffFound: Boolean(staff), emailPresent: Boolean(staff?.email) });
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

export default async function handler(request) {
  const cors = corsHeaders(request.headers.get('origin'));
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type' } });
  try {
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!username || !password) return json({ error: 'credentials_required' }, 400, cors);
      const result = await createSession(username, password);
      if (!result) return json({ error: 'invalid_credentials' }, 401, cors);
      const { appwriteSecret, staff, session } = result;
      return json({ authenticated: true, provider: 'appwrite', user: { id: session.userId, email: staff.email }, staff }, 200, { ...cors, 'set-cookie': sessionCookie(request, appwriteSecret) });
    }
    if (request.method === 'DELETE') {
      const secret = cookieValue(request);
      if (secret) {
        const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
        const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\\/$/, '');
        if (project && endpoint) await fetch(`${endpoint}/account`, { method: 'DELETE', headers: { 'X-Appwrite-Project': project, accept: 'application/json', Cookie: `a_session_${project}=${secret}; a_session_${project}_legacy=${secret}` } }).catch(() => {});
      }
      return json({ ok: true }, 200, { ...cors, 'set-cookie': sessionCookie(request, '', 0) });
    }
    if (request.method === 'GET') {
      const identity = await verifySession(request);
      if (!identity) return json({ authenticated: false }, 401, cors);
      return json({ authenticated: true, provider: 'appwrite', user: { id: identity.user.$id, email: identity.user.email }, staff: identity.staff }, 200, cors);
    }
    return json({ error: 'method_not_allowed' }, 405, cors);
  } catch (error) {
    console.error('admin-auth boundary failure', { name: error?.name, message: error?.message });
    return json({ error: 'admin_auth_unavailable' }, 503, cors);
  }
}