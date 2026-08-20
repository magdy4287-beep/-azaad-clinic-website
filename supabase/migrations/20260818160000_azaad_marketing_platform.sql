create table if not exists public.clinic_marketing_channels (
  id uuid primary key default gen_random_uuid(),
  platform_key text not null unique,
  display_name_ar text not null,
  display_name_en text not null,
  icon text not null default '🌐',
  account_url text,
  active boolean not null default true,
  is_builtin boolean not null default false,
  created_by uuid references public.clinic_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.clinic_marketing_channels(platform_key,display_name_ar,display_name_en,icon,is_builtin,account_url)
values
 ('facebook','فيسبوك','Facebook','📘',true,'https://www.facebook.com/'),
 ('instagram','إنستجرام','Instagram','📸',true,'https://www.instagram.com/'),
 ('linkedin','لينكدإن','LinkedIn','💼',true,'https://www.linkedin.com/'),
 ('tiktok','تيك توك','TikTok','🎵',true,'https://www.tiktok.com/'),
 ('website','الموقع','Website','🌐',true,'https://azaad-clinic-website.vercel.app/')
on conflict (platform_key) do update set updated_at=now();

create table if not exists public.clinic_marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text not null default 'awareness',
  status text not null default 'draft' check(status in ('draft','planned','active','paused','completed','archived')),
  start_at timestamptz,
  end_at timestamptz,
  budget numeric(12,2),
  budget_currency text not null default 'EGP',
  ai_strategy jsonb not null default '{}'::jsonb,
  created_by uuid references public.clinic_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_marketing_campaign_channels (
  campaign_id uuid not null references public.clinic_marketing_campaigns(id) on delete cascade,
  channel_id uuid not null references public.clinic_marketing_channels(id) on delete restrict,
  status text not null default 'planned' check(status in ('planned','ready','published','failed','paused')),
  external_campaign_id text,
  external_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(campaign_id,channel_id)
);

create table if not exists public.clinic_marketing_campaign_posts (
  campaign_id uuid not null references public.clinic_marketing_campaigns(id) on delete cascade,
  post_id uuid not null references public.clinic_marketing_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(campaign_id,post_id)
);

create table if not exists public.clinic_marketing_publications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.clinic_marketing_posts(id) on delete cascade,
  channel_id uuid not null references public.clinic_marketing_channels(id) on delete restrict,
  campaign_id uuid references public.clinic_marketing_campaigns(id) on delete set null,
  status text not null default 'ready' check(status in ('ready','published','failed','skipped')),
  external_id text,
  external_url text,
  published_at timestamptz,
  error_message text,
  created_by uuid references public.clinic_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(post_id,channel_id,campaign_id)
);

create table if not exists public.clinic_public_team_profiles (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null unique references public.clinic_staff(id) on delete cascade,
  display_name text not null,
  display_name_en text,
  title text,
  title_en text,
  department text,
  department_en text,
  image_url text,
  bio text,
  bio_en text,
  show_on_patient_portal boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.clinic_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinic_public_team_profiles_visible_idx on public.clinic_public_team_profiles(active,show_on_patient_portal,sort_order);

alter table public.clinic_marketing_channels enable row level security;
alter table public.clinic_marketing_campaigns enable row level security;
alter table public.clinic_marketing_campaign_channels enable row level security;
alter table public.clinic_marketing_campaign_posts enable row level security;
alter table public.clinic_marketing_publications enable row level security;
alter table public.clinic_public_team_profiles enable row level security;

drop policy if exists clinic_marketing_channels_staff on public.clinic_marketing_channels;
create policy clinic_marketing_channels_staff on public.clinic_marketing_channels for all to authenticated using (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING'))) with check (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING')));

drop policy if exists clinic_marketing_campaigns_staff on public.clinic_marketing_campaigns;
create policy clinic_marketing_campaigns_staff on public.clinic_marketing_campaigns for all to authenticated using (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING'))) with check (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING')));

drop policy if exists clinic_marketing_campaign_channels_staff on public.clinic_marketing_campaign_channels;
create policy clinic_marketing_campaign_channels_staff on public.clinic_marketing_campaign_channels for all to authenticated using (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING'))) with check (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING')));

drop policy if exists clinic_marketing_campaign_posts_staff on public.clinic_marketing_campaign_posts;
create policy clinic_marketing_campaign_posts_staff on public.clinic_marketing_campaign_posts for all to authenticated using (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING'))) with check (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING')));

drop policy if exists clinic_marketing_publications_staff on public.clinic_marketing_publications;
create policy clinic_marketing_publications_staff on public.clinic_marketing_publications for all to authenticated using (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING'))) with check (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER','MARKETING')));

drop policy if exists clinic_public_team_profiles_public_read on public.clinic_public_team_profiles;
create policy clinic_public_team_profiles_public_read on public.clinic_public_team_profiles for select to anon,authenticated using (active=true and show_on_patient_portal=true);
drop policy if exists clinic_public_team_profiles_staff_write on public.clinic_public_team_profiles;
create policy clinic_public_team_profiles_staff_write on public.clinic_public_team_profiles for all to authenticated using (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER'))) with check (exists(select 1 from public.clinic_staff s where s.auth_user_id=auth.uid() and s.active=true and upper(s.role) in ('OWNER','ADMIN','MANAGER')));

comment on table public.clinic_marketing_campaigns is 'Internal multi-channel campaign orchestration. External paid ad spend is never initiated automatically.';
comment on table public.clinic_marketing_publications is 'Per-channel publication/handoff audit. External platform publishing requires configured human-approved connector credentials.';
comment on table public.clinic_public_team_profiles is 'Patient-facing team profiles; only explicitly enabled profiles are public.';
