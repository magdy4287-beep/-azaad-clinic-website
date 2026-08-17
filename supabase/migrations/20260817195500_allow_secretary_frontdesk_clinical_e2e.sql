-- Controlled Clinical E2E: align fixture and front-desk authorization with SECRETARY.
CREATE OR REPLACE FUNCTION public.clinic_prepare_controlled_clinical_e2e_fixture()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $function$
declare v_staff_id uuid; v_role text; v_doctor_id uuid; v_service_id uuid; v_patient_id uuid; v_booking_id uuid; v_suffix text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
begin
select id, upper(role) into v_staff_id, v_role from public.clinic_staff where auth_user_id=auth.uid() and active=true limit 1;
if v_staff_id is null or v_role not in ('OWNER','ADMIN','SECRETARY','RECEPTION','RECEPTIONIST','CASHIER') then raise exception 'E2E_FIXTURE_NOT_AUTHORIZED' using errcode='42501'; end if;
select doctor_id into v_doctor_id from public.clinic_staff where username='doctor_amgad' and role='DOCTOR' and active=true and doctor_id is not null limit 1;
if v_doctor_id is null then raise exception 'E2E_DOCTOR_B_NOT_CONFIGURED'; end if;
select id into v_service_id from public.clinic_services where name='جلسة علاج نفسي فردية' and active=true and price is not null and price>=0 limit 1;
if v_service_id is null then raise exception 'E2E_SERVICE_NOT_CONFIGURED'; end if;
insert into public.clinic_patients(mrn,patient_name,patient_phone,patient_phone_normalized,patient_email,gender,notes,active,marital_status,residence) values('E2E-'||v_suffix,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local','other','CONTROLLED_E2E_FIXTURE — synthetic patient; created by clinical authorization E2E fixture factory',true,'single','CONTROLLED_E2E') returning id into v_patient_id;
insert into public.clinic_bookings(booking_code,doctor_id,service_id,patient_name,patient_phone,patient_email,appointment_date,appointment_time,mode,notes,status,patient_language,patient_id,payment_status,service_authorization_status) values('E2E-'||v_suffix,v_doctor_id,v_service_id,'AZAAD E2E Clinical Fixture '||v_suffix,'E2E'||v_suffix,'azaad-e2e-'||lower(v_suffix)||'@invalid.local',current_date+1,time '10:00','in_person','CONTROLLED_E2E_FIXTURE — synthetic booking; safe for authorization E2E only','confirmed','ar',v_patient_id,'unpaid','authorized') returning id into v_booking_id;
return jsonb_build_object('booking_id',v_booking_id,'doctor_id',v_doctor_id,'patient_id',v_patient_id);
end;$function$;

CREATE OR REPLACE FUNCTION public.clinic_frontdesk_checkin(p_booking_id uuid,p_notes text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $function$
declare b public.clinic_bookings%rowtype; inv public.clinic_invoices%rowtype; v_now timestamptz:=now(); v_late boolean; v_role text; v_status text; v_price numeric; v_staff_id uuid;
begin
select id,upper(role) into v_staff_id,v_role from public.clinic_staff where auth_user_id=auth.uid() and active=true limit 1;
if v_staff_id is null or v_role not in ('OWNER','ADMIN','SECRETARY','RECEPTION','RECEPTIONIST','CASHIER') then raise exception 'FRONTDESK_NOT_AUTHORIZED' using errcode='42501'; end if;
select * into b from public.clinic_bookings where id=p_booking_id for update; if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
v_status=lower(coalesce(b.status,'')); if v_status in ('cancelled','canceled') then raise exception 'BOOKING_CANCELLED'; end if; if v_status in ('completed','no_show','checked_in','checked_in_late') then raise exception 'INVALID_CHECKIN_STATUS'; end if; if v_status not in ('pending','confirmed') then raise exception 'INVALID_CHECKIN_STATUS'; end if;
select price into v_price from public.clinic_services where id=b.service_id; if v_price is null or v_price<0 then raise exception 'SERVICE_PRICE_REQUIRED'; end if;
v_late=(v_now::date>b.appointment_date) or (v_now::date=b.appointment_date and v_now::time>b.appointment_time);
update public.clinic_bookings set status=case when v_late then 'checked_in_late' else 'checked_in' end,checked_in_at=v_now,checked_in_by=v_staff_id,checkin_notes=nullif(btrim(coalesce(p_notes,'')),''),notes=case when p_notes is null or btrim(p_notes)='' then notes else coalesce(notes||E'\n','')||p_notes end,updated_at=v_now where id=b.id returning * into b;
select * into inv from public.clinic_invoices where booking_id=b.id order by created_at desc limit 1;
if not found then insert into public.clinic_invoices(patient_id,booking_id,doctor_id,service_id,subtotal,discount,total,status,notes,created_by) values(b.patient_id,b.id,b.doctor_id,b.service_id,v_price,0,v_price,'unpaid',case when v_late then 'Front desk check-in after scheduled time' else 'Front desk check-in' end,v_staff_id) returning * into inv; end if;
insert into public.clinic_audit_log(actor_staff_id,action,entity_type,entity_id,before_data,after_data) values(v_staff_id,'booking_checkin','booking',p_booking_id::text,jsonb_build_object('status',v_status),jsonb_build_object('status',b.status,'late_arrival',v_late,'checked_in_at',v_now,'checked_in_by',v_staff_id,'notes',p_notes,'invoice_id',inv.id,'invoice_total',inv.total));
return jsonb_build_object('booking_id',b.id,'status',b.status,'late_arrival',v_late,'invoice_id',inv.id,'invoice_number',inv.invoice_number,'invoice_status',inv.status,'invoice_total',inv.total,'checked_in_at',v_now,'checked_in_by',v_staff_id);
end;$function$;
