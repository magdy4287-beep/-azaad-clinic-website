alter table public.clinic_staff add column if not exists account_status text not null default 'active' check (account_status in ('active','suspended','disabled','archived'));
alter table public.clinic_staff add column if not exists phone_verified_at timestamptz;
alter table public.clinic_staff add column if not exists account_status_changed_at timestamptz;
alter table public.clinic_staff add column if not exists account_status_changed_by uuid;
create index if not exists clinic_staff_account_status_idx on public.clinic_staff(account_status);

create table if not exists public.clinic_account_security_audit (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.clinic_staff(id) on delete restrict,
  actor_staff_id uuid references public.clinic_staff(id) on delete set null,
  action text not null check (action in ('suspend','disable','reactivate','archive','username_change','password_reset_request','password_changed','phone_verified','session_revoke')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists clinic_account_security_audit_staff_idx on public.clinic_account_security_audit(staff_id, created_at desc);
alter table public.clinic_account_security_audit enable row level security;
drop policy if exists clinic_account_security_audit_select on public.clinic_account_security_audit;
create policy clinic_account_security_audit_select on public.clinic_account_security_audit for select to authenticated using (public.clinic_has_permission('security'));
drop policy if exists clinic_account_security_audit_insert on public.clinic_account_security_audit;
create policy clinic_account_security_audit_insert on public.clinic_account_security_audit for insert to authenticated with check (public.clinic_has_permission('security'));

create or replace function public.owner_set_staff_account_status(p_staff_id uuid,p_status text,p_reason text default null)
returns public.clinic_staff language plpgsql security definer set search_path=public,pg_catalog as $$
declare v_actor uuid; v_target public.clinic_staff%rowtype; v_actor_role text; v_active_owners int; v_previous text;
begin
  v_actor:=public.clinic_current_staff_id();
  select upper(coalesce(role,'')) into v_actor_role from public.clinic_staff where id=v_actor and active=true;
  if v_actor is null or v_actor_role<>'OWNER' then raise exception 'OWNER_ONLY' using errcode='42501'; end if;
  if p_status not in ('active','suspended','disabled','archived') then raise exception 'INVALID_ACCOUNT_STATUS'; end if;
  select * into v_target from public.clinic_staff where id=p_staff_id for update;
  if not found then raise exception 'STAFF_NOT_FOUND'; end if;
  v_previous:=v_target.account_status;
  if v_target.id=v_actor and p_status in ('suspended','disabled','archived') then raise exception 'CANNOT_DISABLE_SELF'; end if;
  if upper(coalesce(v_target.role,''))='OWNER' and p_status in ('suspended','disabled','archived') then
    select count(*) into v_active_owners from public.clinic_staff where upper(coalesce(role,''))='OWNER' and active=true and account_status='active';
    if v_active_owners<=1 then raise exception 'LAST_OWNER_PROTECTED'; end if;
  end if;
  update public.clinic_staff set account_status=p_status,active=(p_status='active'),account_status_changed_at=now(),account_status_changed_by=v_actor,terminated_at=case when p_status in ('archived','disabled') then coalesce(terminated_at,now()) else null end,updated_at=now() where id=p_staff_id returning * into v_target;
  insert into public.clinic_account_security_audit(staff_id,actor_staff_id,action,reason,metadata) values(p_staff_id,v_actor,case p_status when 'suspended' then 'suspend' when 'disabled' then 'disable' when 'archived' then 'archive' else 'reactivate' end,p_reason,jsonb_build_object('previous_status',v_previous,'new_status',p_status));
  return v_target;
end;$$;
revoke all on function public.owner_set_staff_account_status(uuid,text,text) from public;
grant execute on function public.owner_set_staff_account_status(uuid,text,text) to authenticated;
