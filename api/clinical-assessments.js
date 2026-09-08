import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const ALLOWED = new Set(['OWNER', 'ADMIN', 'MANAGER', 'DOCTOR']);

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

async function authorize(req, sql) {
  const secret = cookieValue(req);
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
  const key = String(process.env.APPWRITE_API_KEY || '').trim();
  if (!secret || !endpoint || !project || !key) return null;
  const response = await fetch(`${endpoint}/account`, {
    headers: {
      'X-Appwrite-Project': project,
      'X-Appwrite-Key': key,
      Cookie: `a_session_${project}=${secret}; a_session_${project}_legacy=${secret}`,
      accept: 'application/json'
    }
  });
  if (!response.ok) return null;
  const user = await response.json();
  const rows = await sql`select id,auth_user_id,full_name,username,email,role,active,doctor_id from public.clinic_staff where auth_user_id=${user.$id} and active=true limit 1`;
  const staff = rows[0];
  const role = String(staff?.role || '').toUpperCase();
  return staff && ALLOWED.has(role) ? { user, staff, role } : null;
}

function uuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')); }

async function visitAccess(sql, identity, patientId, visitId) {
  if (!uuid(patientId) || !uuid(visitId)) return null;
  const rows = identity.role === 'DOCTOR'
    ? await sql`select id,patient_id,booking_id,doctor_id from public.clinic_clinical_visits where id=${visitId} and patient_id=${patientId} and doctor_id=${identity.staff.doctor_id} limit 1`
    : await sql`select id,patient_id,booking_id,doctor_id from public.clinic_clinical_visits where id=${visitId} and patient_id=${patientId} limit 1`;
  return rows[0] || null;
}

async function patientAccess(sql, identity, patientId, visitId) {
  if (!uuid(patientId)) return false;
  if (identity.role !== 'DOCTOR') return true;
  const rows = visitId && uuid(visitId)
    ? await sql`select 1 from public.clinic_clinical_visits where id=${visitId} and patient_id=${patientId} and doctor_id=${identity.staff.doctor_id} limit 1`
    : await sql`select 1 from public.clinic_clinical_visits where patient_id=${patientId} and doctor_id=${identity.staff.doctor_id} limit 1`;
  return Boolean(rows[0]);
}

async function templates(sql) {
  const [templateRows, questionRows] = await Promise.all([
    sql`select id,name,name_ar,specialty,purpose,scoring_method,version from public.clinical_assessment_templates where active=true order by name`,
    sql`select id,template_id,question_order,question_text,question_text_ar,category,response_type from public.clinical_assessment_questions where active=true and approved=true and archived_at is null order by template_id,question_order`
  ]);
  return { templates: templateRows, questions: questionRows };
}

async function history(sql, patientId, visitId) {
  const rows = visitId && uuid(visitId)
    ? await sql`select s.id,s.created_at,s.score_percent,s.baseline_score_percent,s.previous_score_percent,s.safety_review_required,s.status,s.template_id,t.name,t.name_ar from public.clinical_assessment_sessions s join public.clinical_assessment_templates t on t.id=s.template_id where s.patient_id=${patientId} and s.clinical_visit_id=${visitId} order by s.created_at desc limit 100`
    : await sql`select s.id,s.created_at,s.score_percent,s.baseline_score_percent,s.previous_score_percent,s.safety_review_required,s.status,s.template_id,t.name,t.name_ar from public.clinical_assessment_sessions s join public.clinical_assessment_templates t on t.id=s.template_id where s.patient_id=${patientId} order by s.created_at desc limit 100`;
  return rows.map((row) => ({ ...row, clinical_assessment_templates: { name: row.name, name_ar: row.name_ar } }));
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return json(res, { error: 'method_not_allowed' }, 405);
  try {
    const databaseUrl = String(process.env.DATABASE_URL || '').trim();
    if (!databaseUrl) return json(res, { error: 'database_not_configured' }, 503);
    const sql = neon(databaseUrl);
    const identity = await authorize(req, sql);
    if (!identity) return json(res, { error: 'authentication_required' }, 401);

    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const action = url.searchParams.get('action') || '';

    if (req.method === 'GET' && action === 'templates') return json(res, await templates(sql));

    if (req.method === 'GET' && action === 'history') {
      const patientId = url.searchParams.get('patient_id') || '';
      const visitId = url.searchParams.get('visit_id') || '';
      if (!(await patientAccess(sql, identity, patientId, visitId))) return json(res, { error: 'forbidden' }, 403);
      return json(res, { sessions: await history(sql, patientId, visitId) });
    }

    if (req.method !== 'POST') return json(res, { error: 'unsupported_action' }, 400);
    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const patientId = String(body.patient_id || '').trim();
    const visitId = String(body.clinical_visit_id || '').trim();
    const templateId = String(body.template_id || '').trim();
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const notes = String(body.clinician_notes || '').trim().slice(0, 20000);
    if (!uuid(patientId) || !uuid(visitId) || !uuid(templateId)) return json(res, { error: 'invalid_context' }, 400);
    const visit = await visitAccess(sql, identity, patientId, visitId);
    if (!visit) return json(res, { error: 'clinical_visit_access_denied' }, 403);

    const templateRows = await sql`select id,scoring_method from public.clinical_assessment_templates where id=${templateId} and active=true limit 1`;
    if (!templateRows[0]) return json(res, { error: 'assessment_template_not_found' }, 404);
    const questions = await sql`select id,response_type,correct_response from public.clinical_assessment_questions where template_id=${templateId} and active=true and approved=true and archived_at is null order by question_order`;
    const allowed = new Map(questions.map((q) => [String(q.id), q]));
    const cleanAnswers = answers.filter((answer) => allowed.has(String(answer?.question_id))).slice(0, questions.length).map((answer) => {
      const q = allowed.get(String(answer.question_id));
      const raw = answer.response_boolean === true || answer.response_boolean === false ? answer.response_boolean : null;
      const text = raw === null ? String(answer.response_text ?? '').slice(0, 10000) : null;
      const correct = raw !== null && q.correct_response !== null ? raw === q.correct_response : null;
      return { questionId: q.id, responseBoolean: raw, responseText: text, isCorrect: correct };
    });
    const scored = cleanAnswers.filter((answer) => answer.isCorrect !== null);
    const score = scored.length ? Number(((scored.filter((answer) => answer.isCorrect).length / scored.length) * 100).toFixed(2)) : null;
    const previousRows = await sql`select score_percent from public.clinical_assessment_sessions where patient_id=${patientId} and template_id=${templateId} order by created_at desc limit 2`;
    const previous = previousRows[0]?.score_percent == null ? null : Number(previousRows[0].score_percent);
    const baseline = previousRows.at(-1)?.score_percent == null ? null : Number(previousRows.at(-1).score_percent);
    const trend = score == null || previous == null ? null : score > previous ? 'improving' : score < previous ? 'worsening' : 'stable';

    const sessionRows = await sql`insert into public.clinical_assessment_sessions (patient_id,clinical_visit_id,template_id,doctor_id,completed_at,total_questions,answered_questions,score_percent,clinician_notes,created_by,baseline_score_percent,previous_score_percent,trend_state,follow_up_recommended,safety_review_required) values (${patientId},${visitId},${templateId},${identity.staff.doctor_id || null},now(),${questions.length},${cleanAnswers.length},${score},${notes || null},${identity.staff.id},${baseline},${previous},${trend},false,false) returning id,score_percent,baseline_score_percent,previous_score_percent,trend_state,safety_review_required`;
    const sessionId = sessionRows[0].id;
    for (const answer of cleanAnswers) {
      await sql`insert into public.clinical_assessment_answers (session_id,question_id,response_boolean,response_text,is_correct,answered_at) values (${sessionId},${answer.questionId},${answer.responseBoolean},${answer.responseText},${answer.isCorrect},now())`;
    }
    return json(res, { session: sessionRows[0], percentage: score });
  } catch (error) {
    console.error('clinical-assessments boundary failure', { name: error?.name, message: error?.message });
    return json(res, { error: 'clinical_assessments_unavailable' }, 503);
  }
}
