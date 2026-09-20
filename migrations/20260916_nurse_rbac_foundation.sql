-- AZAAD canonical NURSE RBAC foundation.
-- Apply only to the controlled Neon development/branch environment first.
-- No production data is modified by this file until explicitly applied.

create table if not exists public.clinic_role_registry (
  role text primary key,
  label_en text not null,
  label_ar text not null,
  category text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.clinic_role_registry(role,label_en,label_ar,category,active)
values
  ('OWNER','Owner','المالك','administration',true),
  ('ADMIN','Administrator','مدير النظام','administration',true),
  ('MANAGER','Manager','مدير','administration',true),
  ('SECRETARY','Secretary','سكرتير','frontdesk',true),
  ('RECEPTION','Reception','استقبال','frontdesk',true),
  ('CASHIER','Cashier','خزينة','finance',true),
  ('DOCTOR','Doctor','طبيب','clinical',true),
  ('NURSE','Nurse','تمريض','clinical',true),
  ('MARKETING','Marketing','تسويق','commercial',true)
on conflict (role) do update set label_en=excluded.label_en,label_ar=excluded.label_ar,category=excluded.category,active=excluded.active;

-- Refuse the migration rather than silently rewriting unexpected staff roles.
do $$
declare unsupported text;
begin
  select string_agg(role, ', ' order by role)
    into unsupported
  from (
    select distinct upper(trim(role)) as role
    from public.clinic_staff
    where role is not null
      and upper(trim(role)) not in ('OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION','CASHIER','DOCTOR','NURSE','MARKETING')
  ) x;
  if unsupported is not null then
    raise exception 'Unsupported clinic_staff.role values block NURSE RBAC migration: %', unsupported;
  end if;
end $$;

alter table public.clinic_staff
  drop constraint if exists clinic_staff_canonical_role_check;

alter table public.clinic_staff
  add constraint clinic_staff_canonical_role_check
  check (upper(trim(role)) in ('OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION','CASHIER','DOCTOR','NURSE','MARKETING'));

create index if not exists clinic_staff_role_active_idx
  on public.clinic_staff(role, active);
