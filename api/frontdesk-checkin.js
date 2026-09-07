import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const json = (res, body, status = 200) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

function cookieValue(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

async function appwriteAccount(secret) {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
  if (!endpoint || !project || !secret) return null;
  const r = await fetch(`${endpoint}/account`, {
    headers: {
      'X-Appwrite-Project': project,
      accept: 'application/json',
      Cookie: `a_session_${project}=${secret}`,
    },
  });
  if (!r.ok) return null;
  return r.json();
}

async function authorize(req, sql) {
  const user = await appwriteAccount(cookieValue(req));
  if (!user?.$id) return null;
  const schema = await sql`select exists(select 1 from information_schema.tables where table_schema='public' and table_name='clinic_staff') as staff_table`;
  if (!schema[0]?.staff_table) return { unprovisioned: true };
  const rows = await sql`select id,auth_user_id,role,active from public.clinic_staff where auth_user_id=${user.$id} and active=true limit 1`;
  const staff = rows[0];
  if (!staff) return null;
  const role = String(staff.role || '').toUpperCase();
  if (!['OWNER', 'ADMIN', 'MANAGER', 'SECRETARY', 'RECEPTION', 'FRONTDESK'].includes(role)) return null;
  return { user, staff, role };
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve(null);
      try { resolve(JSON.parse(raw)); } catch { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'method_not_allowed' }, 405);
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) return json(res, { error: 'backend_not_configured' }, 503);
  try {
    const sql = neon(databaseUrl);
    const identity = await authorize(req, sql);
    if (!identity) return json(res, { error: 'authentication_required' }, 401);
    if (identity.unprovisioned) return json(res, { error: 'clinical_identity_backend_not_provisioned' }, 503);
    const body = await readJson(req);
    const bookingId = String(body?.booking_id || '').trim();
    if (!bookingId) return json(res, { error: 'booking_id_required' }, 400);
    const rows = await sql`select id,booking_code,patient_id,patient_name,appointment_date,appointment_time,status,checked_in_at,checked_in_by,checkin_notes from public.clinic_bookings where id=${bookingId}::uuid limit 1`;
    const booking = rows[0];
    if (!booking) return json(res, { error: 'booking_not_found' }, 404);
    if (booking.checked_in_at) return json(res, { error: 'already_checked_in', data: booking }, 409);
    return json(res, { error: 'clinical_transaction_boundary_not_provisioned' }, 503);
  } catch (error) {
    console.error('frontdesk-checkin boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'clinical_backend_unavailable' }, 503);
  }
}
