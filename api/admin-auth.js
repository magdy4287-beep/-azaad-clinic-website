import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const SESSION_MAX_AGE = 60 * 60 * 8;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function corsHeaders(origin) {
  const allowed = new Set([
    'https://azaad-clinic-website.vercel.app',
    'https://azaad-clinic-website-magdy-team.vercel.app',
  ]);
  return origin && allowed.has(origin)
    ? { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', vary: 'Origin' }
    : {};
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
  return fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      'X-Appwrite-Project': project,
      'X-Appwrite-Key': apiKey,
      accept: 'application/json',
      ...(options.headers || {}),
    },
  });
}

async function resolveStaff(username) {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_RUNTIME_NOT_CONFIGURED');
  const sql = neon(databaseUrl);
  const rows = await sql`
    select id, auth_user_id, full_name, username, email, phone, role, active
    from public.clinic_staff
    where active = true
      and (lower(username) = lower(${username}) or lower(email) = lower(${username}))
    order by case when lower(username) = lower(${username}) then 0 else 1 end
    limit 1
  `;
  return rows[0] || null;
}

async function createSession(username, password) {
  const staff = await resolveStaff(username);
  if (!staff?.email) return null;
  const response = await appwriteRequest('/account/sessions/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: staff.email, password }),
  });
  if (!response.ok) return null;
  const session = await response.json();
  return { session, staff };
}

async function verifySession(request) {
  const secret = request.headers.get('x-azaad-appwrite-session') || cookieValue(request);
  if (!secret) return null;
  const response = await appwriteRequest('/account', {
    method: 'GET',
    headers: { 'X-Appwrite-Session': secret },
  });
  if (!response.ok) return null;
  const user = await response.json();
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl || !user?.$id) return null;
  const sql = neon(databaseUrl);
  const rows = await sql`
    select id, auth_user_id, full_name, username, email, phone, role, active
    from public.clinic_staff
    where auth_user_id = ${user.$id} and active = true
    limit 1
  `;
  const staff = rows[0] || null;
  if (!staff) return null;
  return { user, staff, secret };
}

export default async function handler(request) {
  const cors = corsHeaders(request.headers.get('origin'));
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type,x-azaad-appwrite-session' } });

  try {
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!username || !password) return json({ error: 'credentials_required' }, 400, cors);
      const result = await createSession(username, password);
      if (!result) return json({ error: 'invalid_credentials' }, 401, cors);
      const { session, staff } = result;
      const headers = {
        ...cors,
        'set-cookie': `${COOKIE}=${encodeURIComponent(session.secret)}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
      };
      return json({
        user: { id: session.userId, email: staff.email },
        staff,
        session: { access_token: session.secret, user: { id: session.userId, email: staff.email } },
        provider: 'appwrite',
      }, 200, headers);
    }

    if (request.method === 'DELETE') {
      const secret = cookieValue(request);
      if (secret) {
        await appwriteRequest(`/account/sessions/${encodeURIComponent(secret)}`, { method: 'DELETE', headers: { 'X-Appwrite-Session': secret } }).catch(() => {});
      }
      return json({ ok: true }, 200, { ...cors, 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
    }

    if (request.method === 'GET') {
      const identity = await verifySession(request);
      if (!identity) return json({ authenticated: false }, 401, cors);
      return json({ authenticated: true, provider: 'appwrite', user: { id: identity.user.$id, email: identity.user.email }, staff: identity.staff, session: { access_token: identity.secret, user: { id: identity.user.$id, email: identity.user.email } } }, 200, cors);
    }

    return json({ error: 'method_not_allowed' }, 405, cors);
  } catch (error) {
    console.error('admin-auth boundary failure', { name: error?.name, message: error?.message });
    return json({ error: 'admin_auth_unavailable' }, 503, cors);
  }
}
