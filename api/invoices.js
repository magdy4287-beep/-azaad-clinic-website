import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const ROLES = {
  invoice: new Set(['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']),
  request: new Set(['SECRETARY', 'RECEPTION', 'CASHIER', 'ADMIN', 'MANAGER', 'OWNER']),
  doctor: new Set(['DOCTOR', 'ADMIN', 'MANAGER', 'OWNER']),
  management: new Set(['MANAGER', 'ADMIN', 'OWNER']),
  process: new Set(['CASHIER', 'MANAGER', 'ADMIN', 'OWNER']),
};

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
  return staff && ROLES.invoice.has(role) || staff && (ROLES.request.has(role) || ROLES.doctor.has(role) || ROLES.management.has(role) || ROLES.process.has(role)) ? { staff, role, sql } : null;
}

async function refundBoundary(req, res, identity) {
  const { sql, role } = identity;
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const action = String(url.searchParams.get('action') || '').toLowerCase();

  if (req.method === 'GET') {
    if (![...Object.values(ROLES)].some(set => set.has(role))) return json(res, { error: 'forbidden' }, 403);
    const rows = await sql`
      select r.*, i.invoice_number, i.total as invoice_total
      from public.clinic_refund_requests r
      left join public.clinic_invoices i on i.id = r.invoice_id
      order by r.requested_at desc nulls last, r.created_at desc nulls last
      limit 100
    `;
    return json(res, { provider: 'appwrite-neon', role, refunds: rows });
  }
  if (req.method !== 'POST') return json(res, { error: 'method_not_allowed' }, 405);
  let body = {};
  try { body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); } catch { return json(res, { error: 'invalid_json' }, 400); }

  if (action === 'request') {
    if (!ROLES.request.has(role)) return json(res, { error: 'forbidden' }, 403);
    const bookingId = String(body.booking_id || '').trim();
    const amount = Number(body.amount);
    const reason = String(body.reason || '').trim();
    if (!bookingId || !Number.isFinite(amount) || amount <= 0 || !reason) return json(res, { error: 'invalid_refund_request' }, 400);
    const invoices = await sql`select id, patient_id, booking_id, total, coalesce(refunded_amount,0) refunded_amount from public.clinic_invoices where booking_id=${bookingId} order by created_at desc limit 1`;
    const invoice = invoices[0];
    if (!invoice) return json(res, { error: 'invoice_not_found' }, 404);
    const payments = await sql`select id, coalesce(amount,0) amount from public.clinic_payments where invoice_id=${invoice.id} and verification_status='verified'`;
    const paid = payments.reduce((n, p) => n + Number(p.amount || 0), 0);
    const refundable = Math.max(0, paid - Number(invoice.refunded_amount || 0));
    if (amount > refundable + 0.00001) return json(res, { error: 'amount_exceeds_refundable_balance', refundable }, 409);
    const rows = await sql`
      insert into public.clinic_refund_requests
        (invoice_id,payment_id,booking_id,patient_id,doctor_id,requested_by,requested_at,amount,reason_code,reason,status,doctor_approval_status,management_approval_status,metadata)
      values (${invoice.id},${payments[0]?.id || null},${invoice.booking_id},${invoice.patient_id},null,${identity.staff.id},now(),${amount},${String(body.reason_code || 'other')},${reason},'pending','pending','pending',jsonb_build_object('source','appwrite-neon-refund-workflow','boundary','api/invoices'))
      returning *`;
    return json(res, { provider: 'appwrite-neon', refund: rows[0] }, 201);
  }

  const id = String(body.refund_id || '').trim();
  if (!id) return json(res, { error: 'refund_id_required' }, 400);
  if (action === 'approve_refund_doctor') {
    if (!ROLES.doctor.has(role)) return json(res, { error: 'forbidden' }, 403);
    const rows = await sql`update public.clinic_refund_requests set doctor_approval_status='approved', doctor_approved_by=${identity.staff.id}, doctor_approved_at=now(), doctor_approval_note=${String(body.note || '')}, status='pending' where id=${id} and status='pending' and doctor_approval_status='pending' returning *`;
    return rows[0] ? json(res, { provider: 'appwrite-neon', refund: rows[0] }) : json(res, { error: 'invalid_refund_state' }, 409);
  }
  if (action === 'approve_refund_management') {
    if (!ROLES.management.has(role)) return json(res, { error: 'forbidden' }, 403);
    const rows = await sql`update public.clinic_refund_requests set management_approval_status='approved', management_approved_by=${identity.staff.id}, management_approved_at=now(), management_approval_note=${String(body.note || '')}, status='approved' where id=${id} and status='pending' and doctor_approval_status='approved' and management_approval_status='pending' returning *`;
    return rows[0] ? json(res, { provider: 'appwrite-neon', refund: rows[0] }) : json(res, { error: 'invalid_refund_state' }, 409);
  }
  if (action === 'process_refund') {
    if (!ROLES.process.has(role)) return json(res, { error: 'forbidden' }, 403);
    const method = String(body.refund_method || '').trim().toLowerCase();
    const reference = String(body.refund_reference || '').trim();
    if (!['cash', 'bank', 'card', 'wallet', 'gateway'].includes(method)) return json(res, { error: 'invalid_refund_method' }, 400);
    if (method !== 'cash' && !reference) return json(res, { error: 'refund_reference_required' }, 400);
    const rows = await sql`update public.clinic_refund_requests set status='processed', processed_by=${identity.staff.id}, processed_at=now(), refund_method=${method}, refund_reference=${reference || null} where id=${id} and status='approved' and doctor_approval_status='approved' and management_approval_status='approved' returning *`;
    return rows[0] ? json(res, { provider: 'appwrite-neon', refund: rows[0] }) : json(res, { error: 'invalid_refund_state' }, 409);
  }
  return json(res, { error: 'unknown_action' }, 400);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return json(res, { error: 'method_not_allowed' }, 405);
  try {
    const identity = await authorize(req);
    if (!identity) return json(res, { error: 'authentication_required' }, 401);
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    if (String(url.searchParams.get('resource') || '').toLowerCase() === 'refunds') return await refundBoundary(req, res, identity);
    if (!ROLES.invoice.has(identity.role)) return json(res, { error: 'forbidden' }, 403);
    if (req.method !== 'GET') return json(res, { error: 'method_not_allowed' }, 405);
    const databaseUrl = String(process.env.DATABASE_URL || '').trim();
    if (!databaseUrl) return json(res, { error: 'database_not_configured' }, 503);
    const sql = identity.sql;
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
    console.error('invoices/refunds boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'invoice_center_unavailable' }, 503);
  }
}
