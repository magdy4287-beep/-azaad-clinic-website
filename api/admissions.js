import { neon } from '@neondatabase/serverless';

const COOKIE = 'azaad_admin_appwrite_session';
const READ_ROLES = new Set(['OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION','DOCTOR','NURSE']);
const WRITE_ROLES = new Set(['OWNER','ADMIN','MANAGER','DOCTOR','NURSE']);

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}
function cookie(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : '';
}
async function account(secret) {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
  if (!endpoint || !project || !secret) return null;
  const value = `a_session_${project}=${secret}; a_session_${project}_legacy=${secret}`;
  const r = await fetch(`${endpoint}/account`, { headers: { 'X-Appwrite-Project': project, Cookie: value, accept: 'application/json' } });
  return r.ok ? r.json() : null;
}
async function auth(req) {
  const user = await account(cookie(req));
  if (!user?.$id) return null;
  const url = String(process.env.DATABASE_URL || '').trim();
  if (!url) throw new Error('DATABASE_RUNTIME_NOT_CONFIGURED');
  const sql = neon(url);
  const rows = await sql`select id, role, active, account_status from public.clinic_staff where auth_user_id=${user.$id} and active=true limit 1`;
  const staff = rows[0];
  const role = String(staff?.role || '').toUpperCase();
  if (!staff || staff.account_status !== 'active' || !READ_ROLES.has(role)) return null;
  return { sql, staff, role };
}
function id(value, name) {
  const v = String(value || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(v)) throw new Error(`${name}_required`);
  return v;
}
async function event(sql, staffId, admissionId, patientId, type, data = {}) {
  await sql`insert into public.clinic_inpatient_events(admission_id,patient_id,actor_staff_id,event_type,event_data) values (${admissionId || null},${patientId || null},${staffId},${type},${JSON.stringify(data)}::jsonb)`;
}
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise(resolve => { let raw=''; req.on('data', c => raw += c); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } }); req.on('error', () => resolve({})); });
}

export default async function handler(req,res) {
  try {
    const identity = await auth(req);
    if (!identity) return json(res,{error:'unauthorized'},401);
    const {sql,staff,role}=identity;
    const url = new URL(req.url || '/', 'https://azaad.invalid');
    if (req.method === 'GET') {
      const action = url.searchParams.get('action') || 'dashboard';
      if (action === 'dashboard') {
        const [wards,beds,admissions] = await Promise.all([
          sql`select id,code,name,department,gender_policy,active from public.clinic_wards where active=true order by code`,
          sql`select b.id,b.ward_id,b.code,b.room_code,b.bed_type,b.status,w.code as ward_code,w.name as ward_name from public.clinic_beds b join public.clinic_wards w on w.id=b.ward_id where b.active=true order by w.code,b.code`,
          sql`select a.*,ba.bed_id,b.code as bed_code,w.code as ward_code,w.name as ward_name from public.clinic_admissions a left join public.clinic_bed_assignments ba on ba.admission_id=a.id and ba.status='ACTIVE' left join public.clinic_beds b on b.id=ba.bed_id left join public.clinic_wards w on w.id=b.ward_id where a.status in ('REQUESTED','APPROVED','ADMITTED','TRANSFERRED') order by a.created_at desc limit 500`
        ]);
        return json(res,{wards,beds,admissions,provider:'appwrite-neon'});
      }
      if (action === 'patient') {
        const patientId=id(url.searchParams.get('patient_id'),'patient_id');
        const admissions=await sql`select a.*,ba.bed_id,b.code as bed_code,w.code as ward_code,w.name as ward_name from public.clinic_admissions a left join public.clinic_bed_assignments ba on ba.admission_id=a.id and ba.status='ACTIVE' left join public.clinic_beds b on b.id=ba.bed_id left join public.clinic_wards w on w.id=b.ward_id where a.patient_id=${patientId} order by a.created_at desc limit 100`;
        return json(res,{admissions,provider:'appwrite-neon'});
      }
      return json(res,{error:'unsupported_action'},400);
    }
    if (req.method !== 'POST' || !WRITE_ROLES.has(role)) return json(res,{error:'forbidden'},403);
    const b=await body(req); const action=String(b.action||'').trim();
    if (action==='create_ward') {
      const rows=await sql`insert into public.clinic_wards(code,name,department,gender_policy) values (${String(b.code||'').trim().toUpperCase()},${String(b.name||'').trim()},${String(b.department||'').trim()||null},${String(b.gender_policy||'MIXED')}) returning *`;
      await event(sql,staff.id,null,null,'WARD_CREATED',{ward_id:rows[0].id}); return json(res,{row:rows[0],provider:'appwrite-neon'},201);
    }
    if (action==='create_bed') {
      const wardId=id(b.ward_id,'ward_id');
      const rows=await sql`insert into public.clinic_beds(ward_id,code,room_code,bed_type) values (${wardId},${String(b.code||'').trim().toUpperCase()},${String(b.room_code||'').trim()||null},${String(b.bed_type||'STANDARD')}) returning *`;
      await event(sql,staff.id,null,null,'BED_CREATED',{bed_id:rows[0].id,ward_id:wardId}); return json(res,{row:rows[0],provider:'appwrite-neon'},201);
    }
    if (action==='admit') {
      const patientId=id(b.patient_id,'patient_id');
      const rows=await sql`insert into public.clinic_admissions(patient_id,encounter_id,admission_type,status,source,requesting_staff_id,admitting_staff_id,expected_discharge_at) values (${patientId},${b.encounter_id ? id(b.encounter_id,'encounter_id') : null},${String(b.admission_type||'INPATIENT')},'ADMITTED',${String(b.source||'CLINICAL')},${staff.id},${staff.id},${b.expected_discharge_at||null}) returning *`;
      await event(sql,staff.id,rows[0].id,patientId,'PATIENT_ADMITTED',{admission_type:rows[0].admission_type}); return json(res,{row:rows[0],provider:'appwrite-neon'},201);
    }
    if (action==='assign_bed') {
      const admissionId=id(b.admission_id,'admission_id'); const bedId=id(b.bed_id,'bed_id');
      const available=await sql`select id,status from public.clinic_beds where id=${bedId} and active=true limit 1`;
      if (!available[0] || !['AVAILABLE','RESERVED'].includes(available[0].status)) return json(res,{error:'bed_not_available'},409);
      await sql`update public.clinic_bed_assignments set status='ENDED',ended_at=now() where admission_id=${admissionId} and status='ACTIVE'`;
      const rows=await sql`insert into public.clinic_bed_assignments(admission_id,bed_id,assigned_by,reason) values (${admissionId},${bedId},${staff.id},${String(b.reason||'')||null}) returning *`;
      await sql`update public.clinic_beds set status='OCCUPIED',updated_at=now() where id=${bedId}`;
      await sql`update public.clinic_admissions set status='ADMITTED',admitted_at=coalesce(admitted_at,now()),updated_at=now() where id=${admissionId}`;
      await event(sql,staff.id,admissionId,null,'BED_ASSIGNED',{bed_id:bedId}); return json(res,{row:rows[0],provider:'appwrite-neon'},201);
    }
    if (action==='transfer') {
      const admissionId=id(b.admission_id,'admission_id'); const toBed=id(b.to_bed_id,'to_bed_id');
      const current=await sql`select bed_id from public.clinic_bed_assignments where admission_id=${admissionId} and status='ACTIVE' limit 1`;
      const available=await sql`select id,status from public.clinic_beds where id=${toBed} and active=true limit 1`;
      if (!available[0] || available[0].status!=='AVAILABLE') return json(res,{error:'target_bed_not_available'},409);
      await sql`insert into public.clinic_inpatient_transfers(admission_id,from_bed_id,to_bed_id,requested_by,approved_by,status,reason,completed_at) values (${admissionId},${current[0]?.bed_id||null},${toBed},${staff.id},${staff.id},'COMPLETED',${String(b.reason||'')||null},now())`;
      if (current[0]?.bed_id) await sql`update public.clinic_beds set status='AVAILABLE',updated_at=now() where id=${current[0].bed_id}`;
      await sql`update public.clinic_bed_assignments set status='ENDED',ended_at=now() where admission_id=${admissionId} and status='ACTIVE'`;
      await sql`insert into public.clinic_bed_assignments(admission_id,bed_id,assigned_by,reason) values (${admissionId},${toBed},${staff.id},'TRANSFER')`;
      await sql`update public.clinic_beds set status='OCCUPIED',updated_at=now() where id=${toBed}`;
      await sql`update public.clinic_admissions set status='TRANSFERRED',updated_at=now() where id=${admissionId}`;
      await event(sql,staff.id,admissionId,null,'INPATIENT_TRANSFER_COMPLETED',{to_bed_id:toBed}); return json(res,{ok:true,provider:'appwrite-neon'});
    }
    if (action==='discharge') {
      const admissionId=id(b.admission_id,'admission_id');
      const current=await sql`select bed_id from public.clinic_bed_assignments where admission_id=${admissionId} and status='ACTIVE' limit 1`;
      await sql`update public.clinic_admissions set status='DISCHARGED',discharged_at=now(),discharge_disposition=${String(b.discharge_disposition||'')||null},discharge_summary=${String(b.discharge_summary||'')||null},updated_at=now() where id=${admissionId}`;
      await sql`update public.clinic_bed_assignments set status='ENDED',ended_at=now() where admission_id=${admissionId} and status='ACTIVE'`;
      if(current[0]?.bed_id) await sql`update public.clinic_beds set status='CLEANING',updated_at=now() where id=${current[0].bed_id}`;
      await event(sql,staff.id,admissionId,null,'PATIENT_DISCHARGED',{bed_id:current[0]?.bed_id||null}); return json(res,{ok:true,provider:'appwrite-neon'});
    }
    return json(res,{error:'unsupported_action'},400);
  } catch(error) {
    console.error('admissions boundary failure',{name:error?.name,message:error?.message});
    return json(res,{error:/_required$/.test(String(error?.message||'')) ? error.message : 'admissions_boundary_failure'}, /_required$/.test(String(error?.message||'')) ? 400 : 500);
  }
}
