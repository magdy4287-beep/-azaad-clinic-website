import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);

function json(res, body, status = 200) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8');
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
  const response = await fetch(`${endpoint}/account`, {
    headers: { 'X-Appwrite-Project': project, Cookie: `a_session_${project}=${secret}`, accept: 'application/json' },
  });
  if (!response.ok) return null;
  return response.json();
}

async function authorize(req) {
  const user = await appwriteAccount(cookieValue(req));
  if (!user?.$id) return null;
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) return null;
  const sql = neon(databaseUrl);
  const rows = await sql`
    select id, auth_user_id, full_name, role, active
    from public.clinic_staff
    where auth_user_id = ${user.$id} and active = true
    limit 1
  `;
  const staff = rows[0];
  const role = String(staff?.role || '').toUpperCase();
  return staff && ROLES.has(role) ? { staff, role } : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, { error: 'method_not_allowed' }, 405);
  try {
    const identity = await authorize(req);
    if (!identity) return json(res, { error: 'authentication_required' }, 401);
    const databaseUrl = String(process.env.DATABASE_URL || '').trim();
    if (!databaseUrl) return json(res, { error: 'database_not_configured' }, 503);
    const sql = neon(databaseUrl);
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 200), 1), 200);
    const rows = await sql`
      select i.id, i.invoice_number, i.booking_id, i.patient_id, i.total, i.status, i.created_at,
        coalesce(p.patient_name, '') as patient_name, coalesce(p.mrn, '') as mrn,
        coalesce(d.name, '') as doctor_name, coalesce(pay.paid_amount, 0) as paid_amount,
        greatest(0, i.total - coalesce(pay.paid_amount, 0)) as remaining_amount
      from public.clinic_invoices i
      left join public.clinic_patients p on p.id = i.patient_id
      left join public.clinic_bookings b on b.id = i.booking_id
      left join public.clinic_doctors d on d.id = b.doctor_id
      left join (
        select invoice_id, sum(case when verification_status <> 'rejected' then amount else 0 end) as paid_amount
        from public.clinic_payments group by invoice_id
      ) pay on pay.invoice_id = i.id
      order by i.created_at desc limit ${limit}
    `;
    const invoices = rows.map((row) => ({ ...row, total_amount: Number(row.total || 0), paid_amount: Number(row.paid_amount || 0), remaining_amount: Number(row.remaining_amount || 0) }));
    const summary = invoices.reduce((s, row) => {
      s.count += 1; s.total += row.total_amount; s.paid += row.paid_amount; s.remaining += row.remaining_amount;
      const status = String(row.status || '').toLowerCase();
      if (status === 'paid') s.paid_invoices += 1; else if (status === 'partial') s.partial_invoices += 1; else s.unpaid_invoices += 1;
      return s;
    }, { count: 0, total: 0, paid: 0, remaining: 0, paid_invoices: 0, partial_invoices: 0, unpaid_invoices: 0 });
    return json(res, { provider: 'appwrite-neon', role: identity.role, summary, invoices });
  } catch (error) {
    console.error('invoices boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'invoice_center_unavailable' }, 503);
  }
}
