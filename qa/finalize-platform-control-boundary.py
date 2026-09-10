from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'api' / 'admin-appointments.js'
text = path.read_text(encoding='utf-8')
marker = "if(resource==='services'||resource==='doctor-services'){"
if text.count(marker) != 1: raise SystemExit('FAIL-CLOSED: expected exactly one Admin service boundary marker')
if "resource==='platform'" in text or "resource==='operations'" in text: raise SystemExit('FAIL-CLOSED: duplicate platform/operations boundary injection detected')
branch = """if(resource==='platform'){
  if(!['OWNER','ADMIN','MANAGER'].includes(identity.role))return json(res,{error:'forbidden'},403);
  if(req.method==='GET'){
    const key=String(url.searchParams.get('feature')||'').trim();if(!key)return json(res,{error:'feature_required'},400);
    const rows=await identity.sql`select key,enabled,rollout_percent,config,description from public.clinic_feature_flags where key=${key} limit 1`;
    return json(res,{feature:rows[0]||null,provider:'appwrite-neon'});
  }
  if(req.method!=='POST')return json(res,{error:'method_not_allowed'},405);let body={};try{body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});}catch{return json(res,{error:'invalid_json'},400);}
  if(body.action!=='audit')return json(res,{error:'unsupported_platform_action'},400);const action=String(body.event_action||'').trim();const entityType=String(body.entity_type||'').trim();const entityId=body.entity_id?String(body.entity_id):null;if(!action||!entityType)return json(res,{error:'audit_fields_required'},400);
  await identity.sql`insert into public.clinic_audit_events(actor_user_id,actor_staff_id,actor_role,action,entity_type,entity_id,details) values(${identity.user.$id},${identity.staff.id},${identity.role},${action},${entityType},${entityId},${JSON.stringify(body.details||{})}::jsonb)`;return json(res,{ok:true,provider:'appwrite-neon'});
}
if(resource==='operations'){
  if(!['OWNER','ADMIN','MANAGER'].includes(identity.role))return json(res,{error:'forbidden'},403);
  const date=String(url.searchParams.get('date')||new Date().toISOString().slice(0,10));
  if(req.method==='GET'){
    const mode=String(url.searchParams.get('mode')||'report');
    if(mode==='expenses'){
      const next=new Date(`${date}T00:00:00Z`);next.setUTCDate(next.getUTCDate()+1);const end=next.toISOString();
      const rows=await identity.sql`select id,expense_number,amount,category,description,payment_method,beneficiary,reference_number,status,incurred_at,created_at from public.clinic_expenses where incurred_at>=${date}::date and incurred_at<${end}::timestamptz order by incurred_at desc limit 500`;return json(res,{expenses:rows,provider:'appwrite-neon'});
    }
    const next=await identity.sql`select (${date}::date + interval '1 day')::date as value`;const end=next[0].value;
    const [appointments,invoices,payments,expenses]=await Promise.all([
      identity.sql`select count(*)::int as appointment_count,count(*) filter(where upper(coalesce(status,''))='CANCELLED')::int as cancelled_count,count(*) filter(where upper(coalesce(status,'')) in ('COMPLETED','DONE'))::int as completed_count from public.clinic_bookings where appointment_date=${date}::date and coalesce(booking_code,'') not ilike 'E2E-%'`,
      identity.sql`select count(*)::int as invoice_count,coalesce(sum(total),0) as invoiced_total from public.clinic_invoices where created_at>=${date}::date and created_at<${end}`,
      identity.sql`select coalesce(sum(amount),0) as collected_total from public.clinic_payments where paid_at>=${date}::date and paid_at<${end} and verification_status is distinct from 'rejected'`,
      identity.sql`select coalesce(sum(amount),0) as expense_total from public.clinic_expenses where incurred_at>=${date}::date and incurred_at<${end}`
    ]);return json(res,{report_date:date,appointments:appointments[0],invoices:invoices[0],payments:payments[0],expenses:expenses[0],provider:'appwrite-neon'});
  }
  if(req.method!=='POST')return json(res,{error:'method_not_allowed'},405);let body={};try{body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});}catch{return json(res,{error:'invalid_json'},400);}
  if(body.action==='expense'){
    const amount=Number(body.amount);if(!Number.isFinite(amount)||amount<=0)return json(res,{error:'invalid_amount'},400);const rows=await identity.sql`insert into public.clinic_expenses(expense_number,amount,category,description,payment_method,beneficiary,reference_number,notes,status,incurred_at,created_by) values(${String(body.expense_number||`EXP-${Date.now()}`)},${amount},${String(body.category||'')},${String(body.description||'')},${String(body.payment_method||'cash')},${String(body.beneficiary||'')},${String(body.reference_number||'')},${String(body.notes||'')},${String(body.status||'draft')},${body.incurred_at?new Date(body.incurred_at):new Date()},${identity.staff.id}) returning id,expense_number,amount,category,status,incurred_at`;return json(res,{expense:rows[0],provider:'appwrite-neon'},201);
  }
  if(body.action==='close_day'){
    const d=String(body.date||date);const next=await identity.sql`select (${d}::date + interval '1 day')::date as value`;const end=next[0].value;const [a,i,p,e]=await Promise.all([identity.sql`select count(*)::int as n,count(*) filter(where upper(coalesce(status,''))='CANCELLED')::int as c,count(*) filter(where upper(coalesce(status,'')) in ('COMPLETED','DONE'))::int as done from public.clinic_bookings where appointment_date=${d}::date and coalesce(booking_code,'') not ilike 'E2E-%'`,identity.sql`select count(*)::int as n,coalesce(sum(total),0) as total from public.clinic_invoices where created_at>=${d}::date and created_at<${end}`,identity.sql`select coalesce(sum(amount),0) as total from public.clinic_payments where paid_at>=${d}::date and paid_at<${end} and verification_status is distinct from 'rejected'`,identity.sql`select coalesce(sum(amount),0) as total from public.clinic_expenses where incurred_at>=${d}::date and incurred_at<${end}`]);const row={report_date:d,staff_id:identity.staff.id,employee_name:identity.staff.full_name,job_title:identity.role,closed_at:new Date().toISOString(),appointment_count:a[0].n,cancelled_count:a[0].c,completed_count:a[0].done,no_show_count:Math.max(a[0].n-a[0].c-a[0].done,0),invoice_count:i[0].n,invoiced_total:i[0].total,collected_total:p[0].total,outstanding_total:Math.max(Number(i[0].total)-Number(p[0].total),0),expense_total:e[0].total,ai_summary:'Deterministic daily reconciliation generated by AZAAD.'};const saved=await identity.sql`insert into public.clinic_daily_reconciliations(report_date,staff_id,employee_name,job_title,closed_at,appointment_count,cancelled_count,completed_count,no_show_count,invoice_count,invoiced_total,collected_total,outstanding_total,expense_total,ai_summary) values(${row.report_date},${row.staff_id},${row.employee_name},${row.job_title},${row.closed_at},${row.appointment_count},${row.cancelled_count},${row.completed_count},${row.no_show_count},${row.invoice_count},${row.invoiced_total},${row.collected_total},${row.outstanding_total},${row.expense_total},${row.ai_summary}) on conflict(report_date,staff_id) do update set closed_at=excluded.closed_at,appointment_count=excluded.appointment_count,cancelled_count=excluded.cancelled_count,completed_count=excluded.completed_count,no_show_count=excluded.no_show_count,invoice_count=excluded.invoice_count,invoiced_total=excluded.invoiced_total,collected_total=excluded.collected_total,outstanding_total=excluded.outstanding_total,expense_total=excluded.expense_total,ai_summary=excluded.ai_summary returning *`;return json(res,{reconciliation:saved[0],provider:'appwrite-neon'});
  }
  return json(res,{error:'unsupported_operations_action'},400);
}
"""
path.write_text(text.replace(marker,branch+marker,1),encoding='utf-8')
print('[AZAAD platform control boundary] PASS: platform and operations use one Appwrite-Neon Admin API owner')
