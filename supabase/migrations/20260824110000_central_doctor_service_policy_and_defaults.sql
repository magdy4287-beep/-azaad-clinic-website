create table if not exists public.clinic_doctor_service_overrides (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.clinic_doctors(id) on delete cascade,
  service_id uuid not null references public.clinic_services(id) on delete cascade,
  enabled boolean not null default false,
  created_by uuid references public.clinic_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doctor_id, service_id)
);

create index if not exists clinic_doctor_service_overrides_doctor_idx
  on public.clinic_doctor_service_overrides(doctor_id, service_id, enabled);

alter table public.clinic_doctor_service_overrides enable row level security;
drop policy if exists clinic_doctor_service_overrides_admin on public.clinic_doctor_service_overrides;
create policy clinic_doctor_service_overrides_admin
  on public.clinic_doctor_service_overrides
  for all to authenticated
  using (public.clinic_has_permission('security'))
  with check (public.clinic_has_permission('security'));

create or replace function public.clinic_admin_doctor_services(p_doctor_id uuid)
returns table(service_id uuid,name text,name_en text,duration_minutes integer,active boolean,enabled boolean,override_id uuid)
language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if not public.clinic_has_permission('security') then raise exception 'NOT_AUTHORIZED'; end if;
  if not exists (select 1 from public.clinic_doctors where id=p_doctor_id) then raise exception 'DOCTOR_NOT_FOUND'; end if;
  return query
  select s.id,s.name,s.name_en,s.duration_minutes,s.active,coalesce(o.enabled,true),o.id
  from public.clinic_services s
  left join public.clinic_doctor_service_overrides o on o.service_id=s.id and o.doctor_id=p_doctor_id
  order by coalesce(s.sort_order,0),s.created_at,s.name;
end; $$;
revoke all on function public.clinic_admin_doctor_services(uuid) from public,anon;
grant execute on function public.clinic_admin_doctor_services(uuid) to authenticated;

create or replace function public.clinic_admin_set_doctor_service(p_doctor_id uuid,p_service_id uuid,p_enabled boolean)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_before jsonb; v_after jsonb;
begin
  if not public.clinic_has_permission('security') then raise exception 'NOT_AUTHORIZED'; end if;
  if not exists (select 1 from public.clinic_doctors where id=p_doctor_id) then raise exception 'DOCTOR_NOT_FOUND'; end if;
  if not exists (select 1 from public.clinic_services where id=p_service_id) then raise exception 'SERVICE_NOT_FOUND'; end if;
  select to_jsonb(x) into v_before from public.clinic_doctor_service_overrides x where x.doctor_id=p_doctor_id and x.service_id=p_service_id;
  if p_enabled then
    delete from public.clinic_doctor_service_overrides where doctor_id=p_doctor_id and service_id=p_service_id;
  else
    insert into public.clinic_doctor_service_overrides(doctor_id,service_id,enabled,created_by,updated_at)
    values(p_doctor_id,p_service_id,false,public.clinic_current_staff_id(),now())
    on conflict (doctor_id,service_id) do update set enabled=false,updated_at=now();
  end if;
  select to_jsonb(x) into v_after from public.clinic_doctor_service_overrides x where x.doctor_id=p_doctor_id and x.service_id=p_service_id;
  insert into public.clinic_audit_log(actor_staff_id,action,entity_type,entity_id,before_data,after_data)
  values(public.clinic_current_staff_id(),case when p_enabled then 'DOCTOR_SERVICE_ENABLED' else 'DOCTOR_SERVICE_DISABLED' end,'doctor_service_policy',p_doctor_id::text,coalesce(v_before,'{}'::jsonb)||jsonb_build_object('service_id',p_service_id),coalesce(v_after,'{}'::jsonb)||jsonb_build_object('service_id',p_service_id,'enabled',p_enabled));
  return true;
end; $$;
revoke all on function public.clinic_admin_set_doctor_service(uuid,uuid,boolean) from public,anon;
grant execute on function public.clinic_admin_set_doctor_service(uuid,uuid,boolean) to authenticated;

create or replace function public.clinic_doctor_service_policy_allows(p_doctor_id uuid,p_service_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_catalog as $$
  select not exists(select 1 from public.clinic_doctor_service_overrides o where o.doctor_id=p_doctor_id and o.service_id=p_service_id and o.enabled=false);
$$;
revoke all on function public.clinic_doctor_service_policy_allows(uuid,uuid) from public,anon,authenticated;
grant execute on function public.clinic_doctor_service_policy_allows(uuid,uuid) to service_role;

create or replace function public.clinic_doctor_service_defaults_on_write()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if new.active=true and (tg_op='INSERT' or old.active=false) then
    new.services := '{}'::text[];
    insert into public.doctor_weekly_schedules(doctor_id,weekday,enabled,start_time,end_time,break_start,break_end,slot_minutes,buffer_minutes,max_daily_bookings,mode)
    select new.id,d,true,time '13:00',time '23:59',null,null,60,0,null,'both'
    from generate_series(0,6) as g(d)
    on conflict (doctor_id,weekday) do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists clinic_doctor_service_defaults_on_write on public.clinic_doctors;
create trigger clinic_doctor_service_defaults_on_write before insert or update of active on public.clinic_doctors for each row execute function public.clinic_doctor_service_defaults_on_write();

update public.clinic_doctors set services='{}'::text[],updated_at=now() where active=true and coalesce(array_length(services,1),0)>0;

-- The canonical availability function must honor the per-doctor service override before generating slots.
-- The complete function body is maintained by the canonical scheduling migration; this migration only records the policy contract.
