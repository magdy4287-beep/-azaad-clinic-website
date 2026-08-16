create or replace function public.clinic_frontdesk_checkin(p_booking_id uuid, p_notes text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $function$
declare
  b public.clinic_bookings%rowtype;
  inv public.clinic_invoices%rowtype;
  v_now timestamptz := now();
  v_late boolean;
  v_role text;
  v_status text;
  v_price numeric;
begin
  select upper(role) into v_role from public.clinic_staff where auth_user_id=auth.uid() and active=true limit 1;
  if v_role is null or v_role not in ('OWNER','ADMIN','RECEPTION','RECEPTIONIST','CASHIER') then raise exception 'FRONTDESK_NOT_AUTHORIZED'; end if;
  select * into b from public.clinic_bookings where id=p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  v_status:=lower(coalesce(b.status,''));
  if v_status in ('cancelled','canceled') then raise exception 'BOOKING_CANCELLED'; end if;
  if v_status in ('completed','no_show') then raise exception 'INVALID_CHECKIN_STATUS'; end if;
  if v_status not in ('pending','confirmed') then raise exception 'INVALID_CHECKIN_STATUS'; end if;
  select price into v_price from public.clinic_services where id=b.service_id;
  if v_price is null or v_price < 0 then raise exception 'SERVICE_PRICE_REQUIRED'; end if;
  v_late := (v_now::date>b.appointment_date) or (v_now::date=b.appointment_date and v_now::time>b.appointment_time);
  update public.clinic_bookings set status=case when v_late then 'checked_in_late' else 'checked_in' end, notes=case when p_notes is null or btrim(p_notes)='' then notes else coalesce(notes||E'\n','')||p_notes end, updated_at=v_now where id=b.id returning * into b;
  select * into inv from public.clinic_invoices where booking_id=b.id order by created_at desc limit 1;
  if not found then
    insert into public.clinic_invoices(patient_id,booking_id,doctor_id,service_id,subtotal,discount,total,status,notes,created_by)
    values(b.patient_id,b.id,b.doctor_id,b.service_id,v_price,0,v_price,'open',case when v_late then 'Front desk check-in after scheduled time' else 'Front desk check-in' end,auth.uid()) returning * into inv;
  end if;
  insert into public.clinic_audit_log(actor_staff_id,action,entity_type,entity_id,before_data,after_data)
  values(public.clinic_current_staff_id(),'booking_checkin','booking',p_booking_id::text,jsonb_build_object('status',v_status),jsonb_build_object('status',b.status,'late_arrival',v_late,'notes',p_notes,'invoice_id',inv.id,'invoice_total',inv.total));
  return jsonb_build_object('booking_id',b.id,'status',b.status,'late_arrival',v_late,'invoice_id',inv.id,'invoice_number',inv.invoice_number,'invoice_status',inv.status,'invoice_total',inv.total,'checked_in_at',v_now);
end;
$function$;
