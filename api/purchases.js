import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const STAFF_ROLES = new Set(['OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION','CASHIER','DOCTOR','MARKETING']);
const READ_ROLES = new Set(['OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION','CASHIER']);
const WRITE_ROLES = new Set(['OWNER','ADMIN','MANAGER']);
const PAYMENT_METHODS = new Set(['cash','bank_transfer','card','other']);

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
  const response = await fetch(`${endpoint}/account`, {
    headers: { 'X-Appwrite-Project': project, accept: 'application/json', Cookie: cookie }
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
  const rows = await sql`select id,auth_user_id,full_name,username,email,phone,role,active,account_status from public.clinic_staff where auth_user_id=${user.$id} and active=true limit 1`;
  const staff = rows[0];
  if (!staff) return null;
  const role = String(staff.role || '').toUpperCase().trim();
  if (!STAFF_ROLES.has(role)) return null;
  return { user, staff, role, sql };
}

function payload(body = {}) {
  const itemName = String(body.item_name || '').trim();
  const purchaseNumber = String(body.purchase_number || '').trim() || null;
  const category = String(body.category || '').trim() || null;
  const supplier = String(body.supplier || '').trim() || null;
  const quantity = Number(body.quantity);
  const unitPrice = Number(body.unit_price);
  const paymentMethod = String(body.payment_method || 'cash').trim();
  const purchasedAt = body.purchased_at ? new Date(body.purchased_at) : new Date();
  const notes = String(body.notes || '').trim() || null;
  if (!itemName) return { error: 'item_name_required' };
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'invalid_quantity' };
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return { error: 'invalid_unit_price' };
  if (!PAYMENT_METHODS.has(paymentMethod)) return { error: 'invalid_payment_method' };
  if (Number.isNaN(purchasedAt.getTime())) return { error: 'invalid_purchased_at' };
  return { itemName, purchaseNumber, category, supplier, quantity, unitPrice, paymentMethod, purchasedAt: purchasedAt.toISOString(), notes };
}

async function audit(sql, staffId, action, entityId, beforeData, afterData) {
  await sql`insert into public.clinic_audit_log(actor_staff_id,action,entity_type,entity_id,before_data,after_data) values(${staffId},${action},'clinic_purchase',${entityId},${beforeData ? JSON.stringify(beforeData) : null}::jsonb,${afterData ? JSON.stringify(afterData) : null}::jsonb)`;
}

export default async function handler(req, res) {
  try {
    const identity = await authorize(req);
    if (!identity) return json(res, { error: 'authentication_required' }, 401);
    if (!READ_ROLES.has(identity.role)) return json(res, { error: 'forbidden' }, 403);

    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const id = String(url.searchParams.get('id') || '').trim();

    if (req.method === 'GET') {
      const rows = await identity.sql`select id,purchase_number,item_name,category,quantity,unit_price,total,supplier,purchased_at,payment_method,notes,created_by,created_at from public.clinic_purchases order by purchased_at desc,created_at desc limit 500`;
      return json(res, { purchases: rows, count: rows.length, provider: 'appwrite-neon' });
    }

    if (!WRITE_ROLES.has(identity.role)) return json(res, { error: 'forbidden' }, 403);
    if (!['POST','PATCH','DELETE'].includes(req.method)) return json(res, { error: 'method_not_allowed' }, 405);

    if (req.method === 'DELETE') {
      if (!id) return json(res, { error: 'purchase_id_required' }, 400);
      const beforeRows = await identity.sql`select id,purchase_number,item_name,category,quantity,unit_price,total,supplier,purchased_at,payment_method,notes,created_by,created_at from public.clinic_purchases where id=${id}::uuid limit 1`;
      if (!beforeRows[0]) return json(res, { error: 'purchase_not_found' }, 404);
      await identity.sql`delete from public.clinic_purchases where id=${id}::uuid`;
      await audit(identity.sql, identity.staff.id, 'PURCHASE_DELETE', id, beforeRows[0], null);
      return json(res, { ok: true, deleted: true, provider: 'appwrite-neon' });
    }

    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch { return json(res, { error: 'invalid_json' }, 400); }
    const p = payload(body);
    if (p.error) return json(res, { error: p.error }, 422);

    if (req.method === 'POST') {
      try {
        const rows = await identity.sql`insert into public.clinic_purchases(purchase_number,item_name,category,quantity,unit_price,supplier,purchased_at,payment_method,notes,created_by,created_at) values(${p.purchaseNumber},${p.itemName},${p.category},${p.quantity},${p.unitPrice},${p.supplier},${p.purchasedAt},${p.paymentMethod},${p.notes},${identity.staff.id},now()) returning id,purchase_number,item_name,category,quantity,unit_price,total,supplier,purchased_at,payment_method,notes,created_by,created_at`;
        await audit(identity.sql, identity.staff.id, 'PURCHASE_CREATE', rows[0].id, null, rows[0]);
        return json(res, { purchase: rows[0], provider: 'appwrite-neon' }, 201);
      } catch (error) {
        if (error?.code === '23505') return json(res, { error: 'purchase_number_conflict' }, 409);
        throw error;
      }
    }

    if (!id) return json(res, { error: 'purchase_id_required' }, 400);
    const beforeRows = await identity.sql`select id,purchase_number,item_name,category,quantity,unit_price,total,supplier,purchased_at,payment_method,notes,created_by,created_at from public.clinic_purchases where id=${id}::uuid limit 1`;
    if (!beforeRows[0]) return json(res, { error: 'purchase_not_found' }, 404);
    try {
      const rows = await identity.sql`update public.clinic_purchases set purchase_number=${p.purchaseNumber},item_name=${p.itemName},category=${p.category},quantity=${p.quantity},unit_price=${p.unitPrice},supplier=${p.supplier},purchased_at=${p.purchasedAt},payment_method=${p.paymentMethod},notes=${p.notes} where id=${id}::uuid returning id,purchase_number,item_name,category,quantity,unit_price,total,supplier,purchased_at,payment_method,notes,created_by,created_at`;
      if (!rows[0]) return json(res, { error: 'purchase_not_found' }, 404);
      await audit(identity.sql, identity.staff.id, 'PURCHASE_UPDATE', id, beforeRows[0], rows[0]);
      return json(res, { purchase: rows[0], provider: 'appwrite-neon' });
    } catch (error) {
      if (error?.code === '23505') return json(res, { error: 'purchase_number_conflict' }, 409);
      throw error;
    }
  } catch (error) {
    console.error('purchases boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'purchases_boundary_unavailable' }, 503);
  }
}
