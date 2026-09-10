from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'api' / 'admin-appointments.js'
text = path.read_text(encoding='utf-8')
marker = "if(resource==='services'||resource==='doctor-services'){"
if text.count(marker) != 1:
    raise SystemExit('FAIL-CLOSED: expected exactly one Admin appointment service boundary marker')
if "resource==='platform'" in text:
    raise SystemExit('FAIL-CLOSED: platform boundary already injected; duplicate owner detected')
branch = """if(resource==='platform'){
  if(!['OWNER','ADMIN','MANAGER'].includes(identity.role))return json(res,{error:'forbidden'},403);
  if(req.method==='GET'){
    const key=String(url.searchParams.get('feature')||'').trim();
    if(!key)return json(res,{error:'feature_required'},400);
    const rows=await identity.sql`select key,enabled,rollout_percent,config,description from public.clinic_feature_flags where key=${key} limit 1`;
    return json(res,{feature:rows[0]||null,provider:'appwrite-neon'});
  }
  if(req.method!=='POST')return json(res,{error:'method_not_allowed'},405);
  let body={};try{body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});}catch{return json(res,{error:'invalid_json'},400);}
  if(body.action!=='audit')return json(res,{error:'unsupported_platform_action'},400);
  const action=String(body.event_action||'').trim();const entityType=String(body.entity_type||'').trim();const entityId=body.entity_id?String(body.entity_id):null;
  if(!action||!entityType)return json(res,{error:'audit_fields_required'},400);
  await identity.sql`insert into public.clinic_audit_events(actor_user_id,actor_staff_id,actor_role,action,entity_type,entity_id,details) values(${identity.user.$id},${identity.staff.id},${identity.role},${action},${entityType},${entityId},${JSON.stringify(body.details||{})}::jsonb)`;
  return json(res,{ok:true,provider:'appwrite-neon'});
}
"""
path.write_text(text.replace(marker, branch + marker, 1), encoding='utf-8')
print('[AZAAD platform control boundary] PASS: feature flags and audit use the existing Appwrite-Neon Admin boundary')
