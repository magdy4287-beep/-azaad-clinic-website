import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const CLINICAL_ROLES = new Set(['OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION','DOCTOR','NURSE']);
const WRITE_ROLES = new Set(['OWNER','ADMIN','MANAGER','DOCTOR','NURSE']);

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
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
async function appwriteAccount(secret) {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
  if (!endpoint || !project || !secret) return null;
  const cookie = `a_session_${project}=${secret}; a_session_${project}_legacy=${secret}`;
  const response = await fetch(`${endpoint}/account`, { headers: { 'X-Appwrite-Project': project, accept: 'application/json', Cookie: cookie } });
  return response.ok ? response.json() : null;
}
async function authorize(req) {
  const user = await appwriteAccount(cookieValue(req));
  if (!user?.$id) return null;
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_RUNTIME_NOT_CONFIGURED');
  const sql = neon(databaseUrl);
  const rows = await sql`select id, auth_user_id, full_name, role, active, account_status from public.clinic_staff where auth_user_id=${user.$id} and active=true limit 1`;
  const staff = rows[0];
  const role = String(staff?.role || '').toUpperCase();
  if (!staff || staff.account_status === 'disabled' || staff.account_status === 'archived' || !CLINICAL_ROLES.has(role)) return null;
  return { user, staff, role, sql };
}
function canWrite(role) { return WRITE_ROLES.has(role); }
function uuid(value, field) {
  const v = String(value || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(v)) throw new Error(`${field}_required`);
  return v;
}
function jsonValue(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return typeof value === 'string' ? JSON.parse(value) : value;
}
async function audit(sql, staffId, patientId, encounterId, eventType, eventData) {
  await sql`insert into public.clinic_nursing_events(patient_id, encounter_id, actor_staff_id, event_type, event_data) values (${patientId || null}, ${encounterId || null}, ${staffId}, ${eventType}, ${JSON.stringify(eventData || {})}::jsonb)`;
}

export default async function handler(req, res) {
  try {
    const identity = await authorize(req);
    if (!identity) return json(res, { error: 'unauthorized' }, 401);
    const { sql, staff, role } = identity;
    const url = new URL(req.url || '/', 'https://azaad.invalid');

    if (req.method === 'GET') {
      const action = url.searchParams.get('action') || 'queue';
      if (action === 'queue') {
        const patientId = url.searchParams.get('patient_id');
        const rows = patientId
          ? await sql`select id, patient_id, encounter_id, assigned_to, created_by, task_type, priority, status, due_at, instructions, completed_at, created_at from public.clinic_nursing_tasks where patient_id=${patientId} order by created_at desc limit 200`
          : await sql`select id, patient_id, encounter_id, assigned_to, created_by, task_type, priority, status, due_at, instructions, completed_at, created_at from public.clinic_nursing_tasks where status in ('OPEN','IN_PROGRESS') and (assigned_to=${staff.id} or assigned_to is null) order by case priority when 'STAT' then 1 when 'URGENT' then 2 else 3 end, due_at nulls last, created_at desc limit 200`;
        return json(res, { rows, provider: 'appwrite-neon' });
      }
      if (action === 'patient') {
        const patientId = uuid(url.searchParams.get('patient_id'), 'patient_id');
        const [assignments, observations, assessments, plans, handoffs, tasks] = await Promise.all([
          sql`select * from public.clinic_nursing_assignments where patient_id=${patientId} order by assigned_at desc limit 100`,
          sql`select * from public.clinic_nursing_observations where patient_id=${patientId} order by observed_at desc limit 100`,
          sql`select * from public.clinic_nursing_assessments where patient_id=${patientId} order by assessed_at desc limit 100`,
          sql`select * from public.clinic_nursing_care_plans where patient_id=${patientId} order by created_at desc limit 50`,
          sql`select * from public.clinic_nursing_handoffs where patient_id=${patientId} order by created_at desc limit 50`,
          sql`select * from public.clinic_nursing_tasks where patient_id=${patientId} order by created_at desc limit 100`
        ]);
        return json(res, { assignments, observations, assessments, plans, handoffs, tasks, provider: 'appwrite-neon' });
      }
      return json(res, { error: 'unsupported_action' }, 400);
    }

    if (req.method !== 'POST' || !canWrite(role)) return json(res, { error: 'forbidden' }, 403);
    const body = await readJson(req);
    const action = String(body.action || '').trim();
    const patientId = body.patient_id ? uuid(body.patient_id, 'patient_id') : null;
    const encounterId = body.encounter_id ? uuid(body.encounter_id, 'encounter_id') : null;

    if (action === 'assign') {
      const nurseId = uuid(body.nurse_staff_id || staff.id, 'nurse_staff_id');
      const target = await sql`select id, role, active, account_status from public.clinic_staff where id=${nurseId} limit 1`;
      if (!target[0] || String(target[0].role).toUpperCase() !== 'NURSE' || target[0].active !== true || target[0].account_status !== 'active') return json(res, { error: 'active_nurse_required' }, 409);
      const rows = await sql`insert into public.clinic_nursing_assignments(patient_id, encounter_id, nurse_staff_id, assignment_type, notes, created_by) values (${patientId}, ${encounterId}, ${nurseId}, ${String(body.assignment_type || 'PRIMARY')}, ${String(body.notes || '').trim() || null}, ${staff.id}) returning *`;
      await audit(sql, staff.id, patientId, encounterId, 'NURSE_ASSIGNED', { nurse_staff_id: nurseId });
      return json(res, { row: rows[0], provider: 'appwrite-neon' }, 201);
    }
    if (action === 'observation') {
      const rows = await sql`insert into public.clinic_nursing_observations(patient_id, encounter_id, recorded_by, temperature_c, heart_rate, respiratory_rate, systolic_bp, diastolic_bp, spo2, pain_score, consciousness, oxygen_support, notes, source) values (${patientId}, ${encounterId}, ${staff.id}, ${body.temperature_c ?? null}, ${body.heart_rate ?? null}, ${body.respiratory_rate ?? null}, ${body.systolic_bp ?? null}, ${body.diastolic_bp ?? null}, ${body.spo2 ?? null}, ${body.pain_score ?? null}, ${String(body.consciousness || '').trim() || null}, ${String(body.oxygen_support || '').trim() || null}, ${String(body.notes || '').trim() || null}, ${String(body.source || 'NURSING')}) returning *`;
      await audit(sql, staff.id, patientId, encounterId, 'OBSERVATION_RECORDED', { observation_id: rows[0].id });
      return json(res, { row: rows[0], provider: 'appwrite-neon' }, 201);
    }
    if (action === 'assessment') {
      const rows = await sql`insert into public.clinic_nursing_assessments(patient_id, encounter_id, nurse_staff_id, assessment_type, findings, risks, escalation_required) values (${patientId}, ${encounterId}, ${staff.id}, ${String(body.assessment_type || 'GENERAL')}, ${JSON.stringify(jsonValue(body.findings, {}))}::jsonb, ${JSON.stringify(jsonValue(body.risks, []))}::jsonb, ${body.escalation_required === true}) returning *`;
      await audit(sql, staff.id, patientId, encounterId, 'NURSING_ASSESSMENT_RECORDED', { assessment_id: rows[0].id, escalation_required: rows[0].escalation_required });
      return json(res, { row: rows[0], provider: 'appwrite-neon' }, 201);
    }
    if (action === 'care_plan') {
      const rows = await sql`insert into public.clinic_nursing_care_plans(patient_id, encounter_id, created_by, goals, interventions, review_due_at) values (${patientId}, ${encounterId}, ${staff.id}, ${JSON.stringify(jsonValue(body.goals, []))}::jsonb, ${JSON.stringify(jsonValue(body.interventions, []))}::jsonb, ${body.review_due_at || null}) returning *`;
      await audit(sql, staff.id, patientId, encounterId, 'CARE_PLAN_CREATED', { care_plan_id: rows[0].id });
      return json(res, { row: rows[0], provider: 'appwrite-neon' }, 201);
    }
    if (action === 'task') {
      const assignedTo = body.assigned_to ? uuid(body.assigned_to, 'assigned_to') : null;
      const rows = await sql`insert into public.clinic_nursing_tasks(patient_id, encounter_id, assigned_to, created_by, task_type, priority, due_at, instructions) values (${patientId}, ${encounterId}, ${assignedTo}, ${staff.id}, ${String(body.task_type || 'GENERAL')}, ${String(body.priority || 'ROUTINE')}, ${body.due_at || null}, ${String(body.instructions || '').trim() || null}) returning *`;
      await audit(sql, staff.id, patientId, encounterId, 'NURSING_TASK_CREATED', { task_id: rows[0].id });
      return json(res, { row: rows[0], provider: 'appwrite-neon' }, 201);
    }
    if (action === 'handoff') {
      const toNurse = body.to_nurse_staff_id ? uuid(body.to_nurse_staff_id, 'to_nurse_staff_id') : null;
      const summary = String(body.summary || '').trim();
      if (!summary) return json(res, { error: 'summary_required' }, 400);
      const rows = await sql`insert into public.clinic_nursing_handoffs(patient_id, encounter_id, from_nurse_staff_id, to_nurse_staff_id, handoff_type, summary, pending_tasks, risks) values (${patientId}, ${encounterId}, ${staff.id}, ${toNurse}, ${String(body.handoff_type || 'SHIFT')}, ${summary}, ${JSON.stringify(jsonValue(body.pending_tasks, []))}::jsonb, ${JSON.stringify(jsonValue(body.risks, []))}::jsonb) returning *`;
      await audit(sql, staff.id, patientId, encounterId, 'NURSING_HANDOFF_CREATED', { handoff_id: rows[0].id });
      return json(res, { row: rows[0], provider: 'appwrite-neon' }, 201);
    }
    if (action === 'complete_task') {
      const taskId = uuid(body.task_id, 'task_id');
      const rows = await sql`update public.clinic_nursing_tasks set status='COMPLETED', completed_at=now(), updated_at=now() where id=${taskId} and status in ('OPEN','IN_PROGRESS') and (assigned_to=${staff.id} or assigned_to is null) returning *`;
      if (!rows[0]) return json(res, { error: 'task_not_found_or_not_assignable' }, 404);
      await audit(sql, staff.id, rows[0].patient_id, rows[0].encounter_id, 'NURSING_TASK_COMPLETED', { task_id: taskId });
      return json(res, { row: rows[0], provider: 'appwrite-neon' });
    }
    return json(res, { error: 'unsupported_action' }, 400);
  } catch (error) {
    console.error('nursing boundary failure', { name: error?.name, message: error?.message });
    const status = /_required$/.test(String(error?.message || '')) ? 400 : 500;
    return json(res, { error: status === 400 ? error.message : 'nursing_boundary_failure' }, status);
  }
}
