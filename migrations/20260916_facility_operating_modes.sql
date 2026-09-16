-- AZAAD facility operating mode: one platform, selectable certified capability set.
create table if not exists public.facility_operating_mode (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('CLINIC_ONLY','HOSPITAL_ONLY')),
  version integer not null default 1,
  active boolean not null default true,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique(active)
);

create table if not exists public.facility_module_registry (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  module_group text not null,
  display_name_key text not null,
  enabled boolean not null default false,
  clinic_available boolean not null default false,
  hospital_available boolean not null default false,
  dependencies jsonb not null default '[]'::jsonb,
  certification_status text not null default 'UNVERIFIED' check (certification_status in ('UNVERIFIED','CERTIFIED','RETIRED')),
  version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facility_mode_audit (
  id uuid primary key default gen_random_uuid(),
  previous_mode text,
  new_mode text not null,
  changed_by uuid not null,
  reason text,
  created_at timestamptz not null default now()
);

insert into public.facility_operating_mode(mode)
select 'CLINIC_ONLY'
where not exists (select 1 from public.facility_operating_mode where active=true);

insert into public.facility_module_registry(module_key,module_group,display_name_key,enabled,clinic_available,hospital_available,dependencies,certification_status)
values
('core','CORE','module.core',true,true,true,'[]','CERTIFIED'),
('patients','CORE','module.patients',true,true,true,'["core"]','CERTIFIED'),
('scheduling','CLINICAL','module.scheduling',true,true,true,'["patients"]','CERTIFIED'),
('clinical','CLINICAL','module.clinical',true,true,true,'["patients"]','CERTIFIED'),
('rcm','FINANCE','module.rcm',true,true,true,'["patients"]','CERTIFIED'),
('finance','FINANCE','module.finance',true,true,true,'["rcm"]','CERTIFIED'),
('emergency','HOSPITAL','module.emergency',false,false,true,'["patients","clinical"]','CERTIFIED'),
('admission','HOSPITAL','module.admission',false,false,true,'["patients"]','CERTIFIED'),
('wards','HOSPITAL','module.wards',false,false,true,'["admission"]','CERTIFIED'),
('icu','HOSPITAL','module.icu',false,false,true,'["admission","clinical"]','CERTIFIED'),
('nursing','HOSPITAL','module.nursing',false,false,true,'["patients","admission"]','CERTIFIED'),
('pharmacy_internal','HOSPITAL','module.pharmacy_internal',false,false,true,'["patients","clinical"]','CERTIFIED'),
('pharmacy_external','CLINICAL','module.pharmacy_external',false,true,false,'["patients","clinical"]','CERTIFIED'),
('laboratory','HOSPITAL','module.laboratory',false,false,true,'["patients","clinical"]','UNVERIFIED'),
('radiology','HOSPITAL','module.radiology',false,false,true,'["patients","clinical"]','UNVERIFIED'),
('operating_room','HOSPITAL','module.operating_room',false,false,true,'["admission","clinical"]','UNVERIFIED'),
('anesthesia','HOSPITAL','module.anesthesia',false,false,true,'["operating_room","clinical"]','UNVERIFIED'),
('pacu','HOSPITAL','module.pacu',false,false,true,'["anesthesia"]','UNVERIFIED'),
('physiotherapy','SPECIALTY','module.physiotherapy',false,true,true,'["patients","clinical"]','UNVERIFIED'),
('dermatology','SPECIALTY','module.dermatology',false,true,true,'["patients","clinical"]','UNVERIFIED'),
('dental','SPECIALTY','module.dental',false,true,true,'["patients","clinical"]','UNVERIFIED'),
('orthopedics','SPECIALTY','module.orthopedics',false,true,true,'["patients","clinical"]','UNVERIFIED'),
('obgyn','SPECIALTY','module.obgyn',false,true,true,'["patients","clinical"]','UNVERIFIED'),
('internal_medicine','SPECIALTY','module.internal_medicine',false,true,true,'["patients","clinical"]','UNVERIFIED'),
('neurology','SPECIALTY','module.neurology',false,true,true,'["patients","clinical"]','UNVERIFIED'),
('pediatrics','SPECIALTY','module.pediatrics',false,true,true,'["patients","clinical"]','UNVERIFIED')
on conflict (module_key) do nothing;

create index if not exists facility_module_enabled_idx on public.facility_module_registry(enabled,module_group);
