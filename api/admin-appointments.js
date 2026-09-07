import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';

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

async function appwriteAccount(secret) {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
  if (!endpoint || !project || !secret) return null;
  const cookie = `a_session_${project}=${secret}; a_session_${project}_legacy=${secret}`;
  const response = await fetch(`${endpoint}/account`, { headers: { 'X-Appwrite-Project': project, accept: 'application/json', Cookie: cookie } });
  if (!response.ok) return null;
  return response.json();
}

async function authorize(req) {
  const secret = cookieValue(req);
  const user = await appwriteAccount(secret);
  if (!user?.$id) return null;
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) return null;
  const sql = neon(databaseUrl);
  const rows = await sql`
    select id, auth_user_id, full_name, username, email, phone, role, active
    from public.clinic_staff
    where auth_user_id = ${user.$id} and active = true
    limit 1
  `;
  const staff = rows[0];
  if (!staff) return null;
  const role = String(staff.role || '').toUpperCase();
  if (!['OWNER', 'ADMIN', 'MANAGER', 'SECRETARY', 'RECEPTION', 'CASHIER', 'DOCTOR', 'MARKETING'].includes(role)) return null;
  return { user, staff, role };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, { error: 'method_not_allowed' }, 405);
  try {
    const identity = await authorize(req);
    if (!identity) return json(res, { error: 'authentication_required' }, 401);
    if (!['OWNER', 'ADMIN', 'MANAGER', 'SECRETARY', 'RECEPTION', 'DOCTOR'].includes(identity.role)) return json(res, { error: 'forbidden' }, 403);
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const from = url.searchParams.get('from') || '2000-01-01';
    const to = url.searchParams.get('to') || '2100-12-31';
    const requestedLimit = Number(url.searchParams.get('limit') || '500');
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 500;
    const sql = neon(String(process.env.DATABASE_URL).trim());
    const rows = await sql`
      select id, booking_code, patient_name, patient_phone, appointment_date, appointment_time, status, mode, doctor_id, service_id
      from public.clinic_bookings
      where appointment_date >= ${from}::date and appointment_date <= ${to}::date
        and coalesce(booking_code, '') not ilike 'E2E-%'
      order by appointment_date desc, appointment_time asc
      limit ${limit}
    `;
    return json(res, { appointments: rows, count: rows.length, provider: 'appwrite-neon' });
  } catch (error) {
    console.error('admin-appointments boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'appointments_unavailable' }, 503);
  }
}