import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type,apikey",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Cache-Control": "no-store",
};
const json = (x: unknown, s = 200) => new Response(JSON.stringify(x), {
  status: s,
  headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
});
const isoDate = (v: string | null) => /^\d{4}-\d{2}-\d{2}$/.test(v || "")
  ? v!
  : new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function auth(req: Request) {
  const h = req.headers.get("authorization") || "";
  if (!h.startsWith("Bearer ")) return null;
  const token = h.slice(7);
  const u = await db.auth.getUser(token);
  if (u.error || !u.data.user) return null;
  const s = await db.from("clinic_staff").select("id,role,active").eq("auth_user_id", u.data.user.id).maybeSingle();
  if (!s.data?.active) return null;
  if (!["OWNER","ADMIN","MANAGER","DOCTOR","RECEPTION","SECRETARY","CASHIER","MARKETING"].includes(String(s.data.role).toUpperCase())) return null;
  return s.data;
}

const operationalBooking = (x: any) => !String(x?.booking_code || "").toUpperCase().startsWith("E2E-");

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "GET required" }, 405);
  const staff = await auth(req);
  if (!staff) return json({ error: "Unauthorized" }, 401);

  const u = new URL(req.url);
  const from = isoDate(u.searchParams.get("from"));
  const to = isoDate(u.searchParams.get("to"));

  const [b, d, i, p, e, f, a, s] = await Promise.all([
    db.from("clinic_bookings").select("id,doctor_id,appointment_date,status,booking_code").gte("appointment_date", from).lte("appointment_date", to),
    db.from("clinic_doctors").select("id,name,active").order("name"),
    db.from("clinic_invoices").select("id,doctor_id,total,status,created_at,booking_id,clinic_bookings(booking_code)").gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59.999`),
    db.from("clinic_payments").select("invoice_id,amount,paid_at").gte("paid_at", `${from}T00:00:00`).lte("paid_at", `${to}T23:59:59.999`),
    db.from("clinic_expenses").select("amount,category,incurred_at").gte("incurred_at", `${from}T00:00:00`).lte("incurred_at", `${to}T23:59:59.999`),
    db.from("clinic_followups").select("id,status,due_at,followup_type").in("status", ["open", "in_progress"]),
    db.from("clinic_alerts").select("id,severity,status,due_at,alert_type").eq("status", "OPEN"),
    db.from("clinic_staff").select("id,role,active").eq("active", true),
  ]);
  for (const q of [b, d, i, p, e, f, a, s]) if (q.error) return json({ error: q.error.message }, 500);

  const bookings = (b.data || []).filter(operationalBooking);
  const invoices = (i.data || []).filter((x: any) => operationalBooking({ booking_code: x.clinic_bookings?.booking_code }));
  const invoiceIds = new Set(invoices.map((x: any) => x.id));
  const payments = (p.data || []).filter((x: any) => invoiceIds.has(x.invoice_id));
  const expenses = e.data || [], followups = f.data || [], alerts = a.data || [], staffRows = s.data || [];

  const completed = bookings.filter(x => x.status === "completed").length;
  const noShow = bookings.filter(x => x.status === "no_show").length;
  const cancelled = bookings.filter(x => x.status === "cancelled").length;
  const invoiced = invoices.reduce((n, x) => n + Number(x.total || 0), 0);
  const collected = payments.reduce((n, x) => n + Number(x.amount || 0), 0);
  const spent = expenses.reduce((n, x) => n + Number(x.amount || 0), 0);
  const overdueFollowups = followups.filter(x => new Date(x.due_at) < new Date()).length;
  const kpis = {
    bookings: bookings.length,
    completed,
    no_show: noShow,
    cancelled,
    completion_rate: bookings.length ? Math.round(completed * 10000 / bookings.length) / 100 : 0,
    no_show_rate: bookings.length ? Math.round(noShow * 10000 / bookings.length) / 100 : 0,
    invoiced,
    collected,
    outstanding: Math.max(invoiced - collected, 0),
    expenses: spent,
    net_cash_flow: collected - spent,
    open_followups: followups.length,
    overdue_followups: overdueFollowups,
    open_alerts: alerts.length,
    active_staff: staffRows.length,
  };

  const insights: any[] = [];
  const add = (type: string, severity: string, ar: string, en: string, recAr: string, recEn: string, value: number | null = null, unit: string | null = null, payload: any = {}) => insights.push({
    scope: "management",
    insight_type: type,
    severity,
    title_ar: ar,
    title_en: en,
    summary_ar: ar,
    summary_en: en,
    recommendation_ar: recAr,
    recommendation_en: recEn,
    metric_value: value,
    metric_unit: unit,
    payload,
  });

  if (kpis.no_show_rate >= 15) add("no_show_rate", "HIGH", "نسبة عدم الحضور مرتفعة", "No-show rate is high", "فعّل تأكيد الموعد قبل الجلسة والمتابعة الآلية للحالات غير الحاضرة.", "Enable pre-visit confirmation and automated no-show follow-up.", kpis.no_show_rate, "percent");
  if (kpis.completion_rate < 60 && kpis.bookings > 0) add("completion_rate", "MEDIUM", "معدل إنجاز المواعيد يحتاج تحسينًا", "Completion rate needs improvement", "راجع أسباب الإلغاء وعدم الحضور وجدولة المواعيد والقدرة اليومية.", "Review cancellations, no-shows, scheduling and daily capacity.", kpis.completion_rate, "percent");
  if (kpis.outstanding > 0) add("rcm_outstanding", "HIGH", "هناك مبالغ غير محصلة", "Outstanding receivables detected", "اعرض قائمة الفواتير غير المسددة وفعّل متابعة التحصيل قبل الموعد التالي.", "Review unpaid invoices and activate collection follow-up before the next visit.", kpis.outstanding, "EGP");
  if (kpis.net_cash_flow < 0) add("cash_flow", "HIGH", "التدفق النقدي للفترة سلبي", "Negative cash flow for the period", "راجع المصروفات والمشتريات اليومية وقارنها بالإيرادات المحصلة.", "Review daily expenses and purchases against collected revenue.", kpis.net_cash_flow, "EGP");
  if (overdueFollowups > 0) add("followup_backlog", "HIGH", "توجد متابعات متأخرة", "Follow-up backlog detected", "أعطِ الأولوية للمتابعات المتأخرة ووزّعها على الموظفين المتاحين.", "Prioritize overdue follow-ups and distribute them among available staff.", overdueFollowups, "tasks");
  if (alerts.length > 0) add("open_alerts", "MEDIUM", "توجد تنبيهات مفتوحة تحتاج مراجعة", "Open alerts need review", "راجع مركز التنبيهات يوميًا ولا تترك التنبيهات الحرجة مفتوحة.", "Review the alert center daily and do not leave critical alerts unresolved.", alerts.length, "alerts");
  if (insights.length === 0) add("healthy_operations", "INFO", "المؤشرات الحالية مستقرة", "Current indicators are stable", "استمر في المتابعة اليومية وراجع الاتجاهات أسبوعيًا بدل الاعتماد على يوم واحد.", "Continue daily monitoring and review weekly trends instead of relying on a single day.", bookings.length, "bookings");

  let persisted = insights;
  if (["OWNER", "ADMIN", "MANAGER"].includes(String(staff.role).toUpperCase())) {
    await db.from("clinic_ai_insights").update({ status: "EXPIRED" })
      .eq("scope", "management").eq("status", "OPEN")
      .lt("expires_at", new Date().toISOString());

    const { data: existing, error: existingError } = await db.from("clinic_ai_insights")
      .select("insight_type")
      .eq("scope", "management")
      .eq("status", "OPEN")
      .gte("generated_at", `${from}T00:00:00`)
      .lte("generated_at", `${to}T23:59:59.999`);
    if (existingError) return json({ error: existingError.message }, 500);

    const existingTypes = new Set((existing || []).map(x => x.insight_type));
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    for (const x of insights) {
      if (existingTypes.has(x.insight_type)) continue;
      const { error } = await db.from("clinic_ai_insights").insert({ ...x, status: "OPEN", generated_at: new Date().toISOString(), expires_at: expires });
      if (error) return json({ error: error.message }, 500);
    }
    persisted = (existing || []).map(x => ({ insight_type: x.insight_type })) as any[];
  }

  return json({ ok: true, provider: "free-local-rules-engine", from, to, kpis, insights, persisted_types: persisted.map(x => x.insight_type) });
});
