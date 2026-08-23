create table if not exists public.clinic_media_transforms (
  media_key text primary key,
  media_type text not null check (media_type in ('doctor','post','other')),
  source_url text not null,
  scale numeric(5,3) not null default 1 check (scale >= 0.25 and scale <= 4),
  position_x numeric(6,3) not null default 0 check (position_x >= -1 and position_x <= 1),
  position_y numeric(6,3) not null default 0 check (position_y >= -1 and position_y <= 1),
  rotation numeric(6,2) not null default 0 check (rotation >= -180 and rotation <= 180),
  updated_by uuid references public.clinic_staff(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists clinic_media_transforms_type_idx on public.clinic_media_transforms(media_type);
alter table public.clinic_media_transforms enable row level security;
drop policy if exists clinic_media_transforms_public_read on public.clinic_media_transforms;
create policy clinic_media_transforms_public_read on public.clinic_media_transforms for select to anon, authenticated using (true);
drop policy if exists clinic_media_transforms_staff_write on public.clinic_media_transforms;
create policy clinic_media_transforms_staff_write on public.clinic_media_transforms for all to authenticated using (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING'))) with check (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING')));
