import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type,apikey",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Cache-Control": "no-store",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
const clean = (v: unknown) => String(v ?? "").trim();
const hash = async (s: string) => {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
};

async function actor(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const legacy = await db.from("clinic_admin_sessions").select("id,admin_id").eq("token_hash", await hash(token)).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (legacy.data) {
    const a = await db.from("clinic_admins").select("id,username,active").eq("id", legacy.data.admin_id).maybeSingle();
    return a.data?.active ? { role: "OWNER", staff_id: null } : null;
  }
  const { data: userData } = await db.auth.getUser(token);
  if (!userData.user) return null;
  const s = await db.from("clinic_staff").select("id,role,active").eq("auth_user_id", userData.user.id).eq("active", true).maybeSingle();
  if (!s.data) return null;
  const r = String(s.data.role || "").toUpperCase();
  if (!["OWNER", "ADMIN", "MANAGER", "SECRETARY", "RECEPTION", "CASHIER"].includes(r)) return null;
  return { role: r, staff_id: s.data.id };
}

function addDateFilters(q: any, from: string | null, to: string | null) {
  if (from) q = q.gte("created_at", `${from}T00:00:00`);
  if (to) q = q.lte("created_at", `${to}T23:59:59.999`);
  return q;
}
function normalizeMrn(v: string) {
  const x = v.toUpperCase();
  if (/^AZA-\d{6}$/.test(x)) return x;
  if (/^AZA\d{6}$/.test(x)) return `AZA-${x.slice(3)}`;
  if (/^\d{1,6}$/.test(x)) return `AZA-${x.padStart(6, "0")}`;
  return "";
}

function isE2EInvoice(row: any) {
  return String(row?.clinic_bookings?.booking_code || "").toUpperCase().startsWith("E2E-");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const a = await actor(req);
  if (!a) return json({ error: "جلسة الدخول غير صالحة أو منتهية." }, 401);
  const u = new URL(req.url);
  const api = u.searchParams.get("api") || "invoices";
  try {
    if (api === "invoices") {
      const limit = Math.min(Math.max(Number(u.searchParams.get("limit") || 100), 1), 500);
      const q = clean(u.searchParams.get("q"));
      const status = clean(u.searchParams.get("status"));
      const from = u.searchParams.get("from");
      const to = u.searchParams.get("to");

      let query: any = db.from("clinic_invoices").select("*,clinic_patients(mrn,patient_name,patient_phone,patient_email),clinic_doctors(name,title,name_en,title_en),clinic_services(name,name_en),clinic_bookings(booking_code,appointment_date,appointment_time,status)").order("created_at", { ascending: false }).limit(limit);
      query = addDateFilters(query, from, to);
      if (status) query = query.eq("status", status);

      let rows: any[] = [];
      if (q) {
        const safe = q.replace(/[%(),]/g, " ").trim();
        const normalized = normalizeMrn(q);
        let patientIds: string[] = [];
        if (normalized) {
          const p = await db.from("clinic_patients").select("id").eq("mrn", normalized).limit(100);
          if (p.error) return json({ error: p.error.message }, 500);
          patientIds = (p.data || []).map(x => x.id);
        } else {
          const p = await db.from("clinic_patients").select("id").or(`patient_name.ilike.%${safe}%,patient_phone.ilike.%${safe}%,patient_phone_normalized.ilike.%${safe}%,patient_email.ilike.%${safe}%`).limit(200);
          if (p.error) return json({ error: p.error.message }, 500);
          patientIds = (p.data || []).map(x => x.id);
        }
        const direct = await db.from("clinic_invoices").select("id").or(`invoice_number.ilike.%${safe}%,notes.ilike.%${safe}%`).limit(500);
        if (direct.error) return json({ error: direct.error.message }, 500);
        const directIds = (direct.data || []).map(x => x.id);
        let pidIds: string[] = [];
        if (patientIds.length) {
          const pi = await db.from("clinic_invoices").select("id").in("patient_id", patientIds).limit(500);
          if (pi.error) return json({ error: pi.error.message }, 500);
          pidIds = (pi.data || []).map(x => x.id);
        }
        const allIds = [...new Set([...directIds, ...pidIds])];
        if (!allIds.length) return json({ invoices: [], payments: [], summary: { count: 0, total: 0, paid: 0, remaining: 0, paid_invoices: 0, partial_invoices: 0, unpaid_invoices: 0 }, filters: { q, status, from, to, limit } });
        query = query.in("id", allIds);
      }

      const r = await query;
      if (r.error) return json({ error: r.error.message }, 500);
      rows = (r.data || []).filter((row: any) => !isE2EInvoice(row));
      const invoiceIds = rows.map(x => x.id).filter(Boolean);
      const p = invoiceIds.length ? await db.from("clinic_payments").select("id,invoice_id,amount,method,paid_at,verification_status,reference_number,notes,verified_at").in("invoice_id", invoiceIds).order("paid_at", { ascending: false }) : { data: [], error: null };
      if (p.error) return json({ error: p.error.message }, 500);
      const paidBy: Record<string, number> = {};
      for (const x of p.data || []) if (x.verification_status !== "rejected") paidBy[x.invoice_id] = (paidBy[x.invoice_id] || 0) + Number(x.amount || 0);
      const enriched = rows.map(inv => {
        const total = Number(inv.total || 0), paid = Number(paidBy[inv.id] || 0);
        return { ...inv, total_amount: total, paid_amount: paid, remaining_amount: Math.max(0, total - paid) };
      });
      const summary = enriched.reduce((s, x) => {
        s.count++; s.total += x.total_amount; s.paid += x.paid_amount; s.remaining += x.remaining_amount;
        const st = String(x.status || "").toLowerCase();
        if (st === "paid") s.paid_invoices++; else if (st === "partial") s.partial_invoices++; else s.unpaid_invoices++;
        return s;
      }, { count: 0, total: 0, paid: 0, remaining: 0, paid_invoices: 0, partial_invoices: 0, unpaid_invoices: 0 });
      return json({ invoices: enriched, payments: p.data || [], summary, filters: { q, status, from, to, limit } });
    }

    if (api === "invoice") {
      const id = clean(u.searchParams.get("id"));
      if (!id) return json({ error: "invoice id مطلوب." }, 400);
      const r = await db.from("clinic_invoices").select("*,clinic_patients(mrn,patient_name,patient_phone,patient_email),clinic_doctors(name,title,name_en,title_en),clinic_services(name,name_en,duration_minutes,price),clinic_bookings(booking_code,appointment_date,appointment_time,status)").eq("id", id).maybeSingle();
      if (r.error) return json({ error: r.error.message }, 500);
      if (!r.data) return json({ error: "الفاتورة غير موجودة." }, 404);
      if (isE2EInvoice(r.data)) return json({ error: "الفاتورة غير متاحة في البيانات التشغيلية." }, 404);
      const p = await db.from("clinic_payments").select("*").eq("invoice_id", id).order("paid_at", { ascending: false });
      if (p.error) return json({ error: p.error.message }, 500);
      const total = Number(r.data.total || 0), paid = (p.data || []).filter(x => x.verification_status !== "rejected").reduce((n, x) => n + Number(x.amount || 0), 0);
      return json({ invoice: { ...r.data, total_amount: total, paid_amount: paid, remaining_amount: Math.max(0, total - paid) }, payments: p.data || [] });
    }

    return json({ error: "Unknown API" }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
