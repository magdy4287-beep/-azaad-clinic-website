import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER', 'SECRETARY', 'RECEPTION', 'CASHIER', 'DOCTOR', 'MARKETING']);

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

async function authorize(req, sql) {
  const user = await appwriteAccount(cookieValue(req));
  if (!user?.$id) return null;
  const rows = await sql`
    select id, auth_user_id, role, active
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
    const databaseUrl = String(process.env.DATABASE_URL || '').trim();
    if (!databaseUrl) return json(res, { error: 'database_not_configured' }, 503);
    const sql = neon(databaseUrl);
    const identity = await authorize(req, sql);
    if (!identity) return json(res, { error: 'authentication_required' }, 401);

    const rows = await sql`
      select status, count(*)::int as count
      from public.clinic_bookings
      where coalesce(booking_code, '') not ilike 'E2E-%'
      group by status
      order by count(*) desc
    `;
    const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
    const byStatus = Object.fromEntries(rows.map((row) => [String(row.status || 'unknown'), Number(row.count || 0)]));
    const noShows = byStatus.no_show || 0;
    const cancelled = byStatus.cancelled || 0;
    const completed = byStatus.completed || 0;

    const insights = [];
    if (noShows > 0) {
      insights.push({
        title_en: 'No-show queue detected',
        title_ar: 'تم رصد قائمة مواعيد لم تحضر',
        summary_en: `${noShows} booking(s) are currently marked as no-show.`,
        summary_ar: `يوجد ${noShows} موعدًا مسجلًا كعدم حضور.`,
        recommendation_en: 'Review the follow-up queue and contact eligible patients.',
        recommendation_ar: 'راجع قائمة المتابعة وتواصل مع المرضى المؤهلين للمتابعة.',
        severity: noShows >= 10 ? 'high' : 'info'
      });
    }
    if (cancelled > 0) {
      insights.push({
        title_en: 'Cancellation volume available',
        title_ar: 'يوجد حجم من الإلغاءات يحتاج للمراجعة',
        summary_en: `${cancelled} booking(s) are marked as cancelled.`,
        summary_ar: `يوجد ${cancelled} موعدًا مسجلًا كملغى.`,
        recommendation_en: 'Review cancellation reasons and consider rebooking eligible patients.',
        recommendation_ar: 'راجع أسباب الإلغاء وفكر في إعادة حجز المرضى المؤهلين.',
        severity: 'info'
      });
    }
    if (total > 0 && completed === 0) {
      insights.push({
        title_en: 'No completed bookings in the current dataset',
        title_ar: 'لا توجد مواعيد مكتملة في مجموعة البيانات الحالية',
        summary_en: `The database currently reports ${total} booking(s) but none as completed.`,
        summary_ar: `قاعدة البيانات تسجل ${total} موعدًا حاليًا دون حالة مكتملة.`,
        recommendation_en: 'Validate the operational status flow before relying on completion KPIs.',
        recommendation_ar: 'تحقق من دورة حالات الموعد قبل الاعتماد على مؤشرات الإتمام.',
        severity: 'info'
      });
    }

    return json(res, { provider: 'local-rules-neon', human_approval_required: true, insights: insights.slice(0, 20), metrics: { total, byStatus } });
  } catch (error) {
    console.error('ai-insights boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'ai_insights_unavailable' }, 503);
  }
}
