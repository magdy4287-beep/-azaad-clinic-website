const COOKIE = 'azaad_admin_appwrite_session';

function json(res, body, status = 200, headers = {}) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

function corsHeaders(origin) {
  const allowed = new Set([
    'https://azaad-clinic-website.vercel.app',
    'https://azaad-clinic-website-magdy-team.vercel.app',
  ]);
  return origin && allowed.has(origin)
    ? {
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true',
        vary: 'Origin',
      }
    : {};
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

function appwriteConfig() {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
  const apiKey = String(process.env.APPWRITE_API_KEY || '').trim();
  if (!endpoint || !project || !apiKey) throw new Error('APPWRITE_RUNTIME_NOT_CONFIGURED');
  return { endpoint, project, apiKey };
}

async function appwriteAccount(secret) {
  const { endpoint, project } = appwriteConfig();
  if (!secret) return null;
  const cookie = `a_session_${project}=${secret}; a_session_${project}_legacy=${secret}`;
  const response = await fetch(`${endpoint}/account`, {
    headers: { 'X-Appwrite-Project': project, accept: 'application/json', Cookie: cookie },
  });
  if (!response.ok) return null;
  return response.json();
}

async function updatePassword(userId, password) {
  const { endpoint, project, apiKey } = appwriteConfig();
  return fetch(`${endpoint}/users/${encodeURIComponent(userId)}/password`, {
    method: 'PATCH',
    headers: {
      'X-Appwrite-Project': project,
      'X-Appwrite-Key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ password }),
  });
}

export default async function handler(req, res) {
  const cors = corsHeaders(headerValue(req, 'origin'));
  for (const [key, value] of Object.entries(cors)) res.setHeader(key, value);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('access-control-allow-methods', 'POST,OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    return res.end();
  }

  if (req.method !== 'POST') return json(res, { error: 'method_not_allowed' }, 405);

  try {
    const secret = cookieValue(req);
    const identity = await appwriteAccount(secret);
    if (!identity?.$id) return json(res, { error: 'authentication_required' }, 401);

    const body = await bodyValue(req);
    const password = String(body.password || '');
    if (password.length < 12 || password.length > 256) return json(res, { error: 'invalid_password' }, 400);

    const response = await updatePassword(identity.$id, password);
    if (!response.ok) {
      console.warn('change-password Appwrite update rejected', { status: response.status, userIdPresent: Boolean(identity.$id) });
      return json(res, { error: 'password_update_failed' }, 400);
    }

    return json(res, { ok: true, provider: 'appwrite' }, 200);
  } catch (error) {
    console.error('change-password boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'password_update_unavailable' }, 503);
  }
}
