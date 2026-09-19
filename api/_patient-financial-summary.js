import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER', 'SECRETARY', 'RECEPTION', 'CASHIER', 'DOCTOR']);

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
  const apiKey = String(process.env.APPWRITE_API_KEY || '').trim();
  if (!endpoint || !project || !apiKey || !secret) return null;
  const response = await fetch(`${endpoint}/account`, {
    headers: {
      'X-Appwrite-Project': project,
      'X-Appwrite-Key': apiKey,
      Cookie: `a_session_${project}=${secret}`,
      accept: 'application/json',
    },
  });
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
  if (!ALLOWED_ROLES.has(role)) return null;
  return { staff, role };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, { error: 'method_not_allowed' }, 405);

  try {
    const identity = await authorize(req);
    if (!identity) return json(res, { error: 'authentication_required' }, 401);

    const patientId = String(new URL(req.url, `https://${req.headers.host || 'localhost'}`).searchParams.get('patient_id') || '').trim();
    if (!UUID.test(patientId)) return json(res, { error: 'invalid_patient_id' }, 400);

    const databaseUrl = String(process.env.DATABASE_URL || '').trim();
    if (!databaseUrl) return json(res, { error: 'database_not_configured' }, 503);
    const sql = neon(databaseUrl);

    const invoices = await sql`
      select id, invoice_number, booking_id, total, status, created_at, patient_id
      from public.clinic_invoices
      where patient_id = ${patientId}
      order by created_at desc
      limit 100
    `;

    const invoiceIds = invoices.map((row) => row.id).filter(Boolean);
    let payments = [];
    if (invoiceIds.length) {
      payments = await sql`
        select invoice_id, amount, method, paid_at, verification_status
        from public.clinic_payments
        where invoice_id = any(${invoiceIds})
        order by paid_at desc
        limit 500
      `;
    }

    return json(res, { provider: 'appwrite-neon', invoices, payments });
  } catch (error) {
    console.error('patient-financial-summary boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'financial_summary_unavailable' }, 503);
  }
}