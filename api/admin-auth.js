import { neon } from '@neondatabase/serverless';
import { runtimeContract } from '../lib/azaad-runtime-contract.js';

const COOKIE = 'azaad_admin_appwrite_session';
const SESSION_MAX_AGE = 60 * 60 * 8;
const REQUIRED_TABLES = ['clinic_settings','clinic_doctors','clinic_services','clinic_patients','clinic_bookings','clinic_clinical_visits','clinic_invoices','clinic_payments','clinic_audit_log'];

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
  if (typeof headers === 'object') for (const [key, value] of Object.entries(headers)) if (String(key).toLowerCase() === wanted) return Array.isArray(value) ? String(value[0] || '') : String(value || '');
  return '';
}
async function bodyValue(request) {
  const parser = request?.json;
  if (typeof parser === 'function') { const value = await parser.call(request); return value && typeof value === 'object' ? value : {}; }
  const body = request?.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  if (typeof body === 'string') { try { const value = JSON.parse(body); return value && typeof value === 'object' ? value : {}; } catch (_) { return {}; } }
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
  const localHost = /^(localhost|127(?:\\.\\d{1,3}){3}|\\[::1\\])(?::\\d+)?$/.test(host);
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
  if (!response.ok) { console.warn('admin-auth Appwrite session verification rejected', { status: response.status, cookiePresent: true, cookieLength: secret.length }); return null; }
  return response.json();
}
async function resolveStaff(username) {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_RUNTIME_NOT_CONFIGURED');
  const sql = neon(databaseUrl);
  const rows = await sql`select id, auth_user_id, full_name, username, email, phone, role, active from public.clinic_staff where active = true and (lower(username) = lower(${username}) or lower(email) = lower(${username})) order by case when lower(username) = lower(${username}) then 0 else 1 end limit 1`;
  return rows[0] || null;
}
async function databaseFingerprint() {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) return { configured: false };
  try { const sql = neon(databaseUrl); const rows = await sql`select current_database() as db, current_schema() as schema, to_regclass('public.clinic_staff') as clinic_staff_table`; const row = rows[0] || {}; return { configured: true, db: row.db || null, schema: row.schema || null, clinicStaffTable: Boolean(row.clinic_staff_table) }; } catch (_) { return { configured: true, queryOk: false }; }
}
async function createSession(username, password) {
  const staff = await resolveStaff(username);
  if (!staff?.email) { console.warn('admin-auth login rejected before Appwrite session creation', { stage: 'staff_lookup', staffFound: Boolean(staff), emailPresent: Boolean(staff?.email), database: await databaseFingerprint() }); return null; }
  const response = await appwriteRequest('/account/sessions/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: staff.email, password }) });
  if (!response.ok) { console.warn('admin-auth login rejected by Appwrite session creation', { stage: 'appwrite_session_create', status: response.status }); return null; }
  const session = await response.json();
  const parity = Boolean(session?.userId && staff.auth_user_id && session.userId === staff.auth_user_id);
  if (!session?.userId || !session?.secret || !parity) { console.warn('admin-auth login rejected session contract', { stage: 'session_contract', userIdPresent: Boolean(session?.userId), secretPresent: Boolean(session?.secret), parity }); if (session?.secret) await appwriteRequest(`/account/sessions/${encodeURIComponent(session.$id || 'current')}`, { method: 'DELETE' }).catch(() => {}); return null; }
  return { appwriteSecret: session.secret, staff, session };
}
async function verifySession(request) {
  const secret = cookieValue(request); const user = await appwriteAccount(secret); if (!user?.$id) return null;
  const databaseUrl = String(process.env.DATABASE_URL || '').trim(); if (!databaseUrl) return null;
  const sql = neon(databaseUrl); const rows = await sql`select id, auth_user_id, full_name, username, email, phone, role, active from public.clinic_staff where auth_user_id = ${user.$id} and active = true limit 1`;
  const staff = rows[0] || null; return staff ? { user, staff } : null;
}
async function updatePassword(userId, password) {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, ''); const project = String(process.env.APPWRITE_PROJECT_ID || '').trim(); const apiKey = String(process.env.APPWRITE_API_KEY || '').trim();
  if (!endpoint || !project || !apiKey) throw new Error('APPWRITE_RUNTIME_NOT_CONFIGURED');
  return fetch(`${endpoint}/users/${encodeURIComponent(userId)}/password`, { method: 'PATCH', headers: { 'X-Appwrite-Project': project, 'X-Appwrite-Key': apiKey, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ password }) });
}
async function databaseTargetFingerprint() {
  const raw = String(process.env.DATABASE_URL || '').trim(); if (!raw) return null;
  try { const url = new URL(raw); const canonical = `${url.protocol}//${url.hostname}:${url.port || ''}${url.pathname}`; const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical)); return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join(''); } catch (error) { console.error('[AZAAD runtime-health] database target fingerprint failed', error); return null; }
}
async function verifyNeon(sql) {
  const rows = await sql`select table_name from information_schema.tables where table_schema = 'public' and table_name = any(${REQUIRED_TABLES})`;
  const present = new Set(rows.map((row) => row.table_name)); const missing = REQUIRED_TABLES.filter((name) => !present.has(name)); return { reachable: true, requiredTablesPresent: missing.length === 0, missingTables: missing };
}
async function verifyAppwrite() {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').trim().replace(/\/$/, ''); const project = String(process.env.APPWRITE_PROJECT_ID || '').trim(); const key = String(process.env.APPWRITE_API_KEY || '').trim();
  if (!endpoint || !project || !key) return { configured: false, reachable: false, usersApi: false };
  try { const response = await fetch(`${endpoint}/users?limit=1`, { method: 'GET', headers: { 'X-Appwrite-Project': project, 'X-Appwrite-Key': key, Accept: 'application/json' } }); return { configured: true, reachable: response.ok, usersApi: response.ok }; } catch (error) { console.error('[AZAAD runtime-health] Appwrite connectivity failed', error); return { configured: true, reachable: false, usersApi: false }; }
}
async function runtimeHealth(res) {
  const contract = runtimeContract(); let databaseReachable = false; let databaseTables = { reachable: false, requiredTablesPresent: false, missingTables: REQUIRED_TABLES };
  if (contract.database) { try { const sql = neon(process.env.DATABASE_URL); databaseTables = await verifyNeon(sql); databaseReachable = databaseTables.reachable; } catch (error) { console.error('[AZAAD runtime-health] Neon connectivity/schema verification failed', error); } }
  const [appwrite, targetFingerprint] = await Promise.all([verifyAppwrite(), databaseTargetFingerprint()]); const expectedFingerprint = contract.expectedDatabaseTargetFingerprint; const databaseTargetMatches = Boolean(targetFingerprint && expectedFingerprint && targetFingerprint === expectedFingerprint);
  const ready = databaseReachable && databaseTables.requiredTablesPresent && databaseTargetMatches && contract.storage && contract.identity && appwrite.reachable && appwrite.usersApi;
  return json(res, { status: ready ? 'ok' : 'blocked', runtime: 'provider-neutral', supabaseRuntimeAllowed: false, checks: { ...contract, database: databaseReachable, databaseConfigured: contract.configured.DATABASE_URL, databaseReachable, databaseTargetFingerprint: targetFingerprint, databaseTargetMatches, databaseTables, appwrite } }, ready ? 200 : 503);
}
export default async function handler(req, res) {
  const cors = corsHeaders(headerValue(req, 'origin')); for (const [key, value] of Object.entries(cors)) res.setHeader(key, value);
  try {
    const url = new URL(req.url, `https://${headerValue(req, 'host') || 'localhost'}`); const action = url.searchParams.get('action') || '';
    if (req.method === 'OPTIONS') { res.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS'); res.setHeader('access-control-allow-headers', 'content-type'); return res.status(204).end(); }
    if (req.method === 'GET' && action === 'runtime-health') return runtimeHealth(res);
    if (req.method === 'POST' && action === 'change-password') { const identity = await verifySession(req); if (!identity) return json(res, { error: 'authentication_required' }, 401); const body = await bodyValue(req); const password = String(body.password || ''); if (password.length < 12 || password.length > 256) return json(res, { error: 'invalid_password' }, 400); const response = await updatePassword(identity.user.$id, password); if (!response.ok) { console.warn('admin-auth password update rejected', { status: response.status, userIdPresent: Boolean(identity.user.$id) }); return json(res, { error: 'password_update_failed' }, 400); } return json(res, { ok: true, provider: 'appwrite' }); }
    if (req.method === 'POST') { const body = await bodyValue(req); const username = String(body.username || '').trim().toLowerCase(); const password = String(body.password || ''); if (!username || !password) return json(res, { error: 'credentials_required' }, 400); const result = await createSession(username, password); if (!result) return json(res, { error: 'invalid_credentials' }, 401); const { appwriteSecret, staff, session } = result; return json(res, { authenticated: true, provider: 'appwrite', user: { id: session.userId, email: staff.email }, staff }, 200, { 'set-cookie': sessionCookie(req, appwriteSecret) }); }
    if (req.method === 'DELETE') { const secret = cookieValue(req); if (secret) { const project = String(process.env.APPWRITE_PROJECT_ID || '').trim(); const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, ''); if (project && endpoint) await fetch(`${endpoint}/account/sessions/current`, { method: 'DELETE', headers: { 'X-Appwrite-Project': project, accept: 'application/json', Cookie: `a_session_${project}=${secret}; a_session_${project}_legacy=${secret}` } }).catch(() => {}); } return json(res, { ok: true }, 200, { 'set-cookie': sessionCookie(req, '', 0) }); }
    if (req.method === 'GET') { const identity = await verifySession(req); if (!identity) return json(res, { authenticated: false }, 401); return json(res, { authenticated: true, provider: 'appwrite', user: { id: identity.user.$id, email: identity.user.email }, staff: identity.staff }); }
    return json(res, { error: 'method_not_allowed' }, 405);
  } catch (error) { console.error('admin-auth boundary failure', { name: error?.name, message: error?.message }); return json(res, { error: 'admin_auth_unavailable' }, 503); }
}
