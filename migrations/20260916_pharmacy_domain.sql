-- AZAAD Pharmacy Domain: two separate operational pharmacies with shared medication master data.
-- INTERNAL = hospital/inpatient supply. EXTERNAL = outpatient/community dispensing.
create extension if not exists pgcrypto;

create table if not exists public.clinic_medications (
  id uuid primary key default gen_random_uuid(), generic_name text not null, brand_name text,
  strength text, dosage_form text, route text, controlled boolean not null default false,
  formulary_status text not null default 'ACTIVE' check (formulary_status in ('ACTIVE','RESTRICTED','NON_FORMULARY','INACTIVE')),
  external_sellable boolean not null default true, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.clinic_internal_pharmacy_locations (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  unit_scope text not null default 'HOSPITAL', active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.clinic_external_pharmacy_locations (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.clinic_internal_pharmacy_stock_lots (
  id uuid primary key default gen_random_uuid(), location_id uuid not null references public.clinic_internal_pharmacy_locations(id),
  medication_id uuid not null references public.clinic_medications(id), lot_number text not null, expiry_date date,
  quantity numeric(14,3) not null default 0 check (quantity >= 0), unit_cost numeric(14,4), supplier text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(location_id, medication_id, lot_number)
);
create table if not exists public.clinic_external_pharmacy_stock_lots (
  id uuid primary key default gen_random_uuid(), location_id uuid not null references public.clinic_external_pharmacy_locations(id),
  medication_id uuid not null references public.clinic_medications(id), lot_number text not null, expiry_date date,
  quantity numeric(14,3) not null default 0 check (quantity >= 0), unit_price numeric(14,4), supplier text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(location_id, medication_id, lot_number)
);

create table if not exists public.clinic_internal_pharmacy_orders (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null, encounter_id uuid,
  source text not null check (source in ('INPATIENT','ED','ICU','OR','PACU','ADMISSION')), prescriber_staff_id uuid,
  status text not null default 'ORDERED' check (status in ('ORDERED','VERIFIED','PARTIALLY_DISPENSED','DISPENSED','CANCELLED','HELD')),
  priority text not null default 'ROUTINE' check (priority in ('STAT','URGENT','ROUTINE')), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.clinic_internal_pharmacy_order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.clinic_internal_pharmacy_orders(id) on delete cascade,
  medication_id uuid not null references public.clinic_medications(id), dose text, frequency text, route text, duration text,
  quantity_requested numeric(14,3) not null check (quantity_requested > 0), quantity_dispensed numeric(14,3) not null default 0 check (quantity_dispensed >= 0), instructions text
);
create table if not exists public.clinic_internal_pharmacy_dispenses (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.clinic_internal_pharmacy_orders(id),
  order_item_id uuid not null references public.clinic_internal_pharmacy_order_items(id), patient_id uuid not null,
  location_id uuid not null references public.clinic_internal_pharmacy_locations(id), lot_id uuid not null references public.clinic_internal_pharmacy_stock_lots(id),
  quantity numeric(14,3) not null check (quantity > 0), dispensed_by uuid not null,
  status text not null default 'DISPENSED' check (status in ('DISPENSED','REVERSED','RETURNED')), dispensed_at timestamptz not null default now()
);

create table if not exists public.clinic_external_pharmacy_prescriptions (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null, encounter_id uuid,
  source text not null check (source in ('OUTPATIENT','DISCHARGE','EXTERNAL_PRESCRIPTION')), prescriber_staff_id uuid,
  status text not null default 'RECEIVED' check (status in ('RECEIVED','VERIFIED','PARTIALLY_DISPENSED','DISPENSED','CANCELLED','HELD')),
  payment_reference text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.clinic_external_pharmacy_prescription_items (
  id uuid primary key default gen_random_uuid(), prescription_id uuid not null references public.clinic_external_pharmacy_prescriptions(id) on delete cascade,
  medication_id uuid not null references public.clinic_medications(id), dose text, frequency text, route text, duration text,
  quantity_requested numeric(14,3) not null check (quantity_requested > 0), quantity_dispensed numeric(14,3) not null default 0 check (quantity_dispensed >= 0),
  instructions text, substitution_allowed boolean not null default false
);
create table if not exists public.clinic_external_pharmacy_dispenses (
  id uuid primary key default gen_random_uuid(), prescription_id uuid not null references public.clinic_external_pharmacy_prescriptions(id),
  prescription_item_id uuid not null references public.clinic_external_pharmacy_prescription_items(id), patient_id uuid not null,
  location_id uuid not null references public.clinic_external_pharmacy_locations(id), lot_id uuid not null references public.clinic_external_pharmacy_stock_lots(id),
  quantity numeric(14,3) not null check (quantity > 0), dispensed_by uuid not null,
  status text not null default 'DISPENSED' check (status in ('DISPENSED','REVERSED','RETURNED')), dispensed_at timestamptz not null default now()
);

create table if not exists public.clinic_pharmacy_reconciliation (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null, encounter_id uuid,
  medication_id uuid references public.clinic_medications(id), action text not null check (action in ('CONTINUE','START','STOP','CHANGE','HOLD','UNKNOWN')),
  source text not null, notes text, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.clinic_internal_pharmacy_events (
  id uuid primary key default gen_random_uuid(), actor_staff_id uuid not null, patient_id uuid, order_id uuid,
  event_type text not null, event_data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.clinic_external_pharmacy_events (
  id uuid primary key default gen_random_uuid(), actor_staff_id uuid not null, patient_id uuid, prescription_id uuid,
  event_type text not null, event_data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.clinic_internal_pharmacy_inventory_events (
  id uuid primary key default gen_random_uuid(), location_id uuid not null references public.clinic_internal_pharmacy_locations(id),
  lot_id uuid references public.clinic_internal_pharmacy_stock_lots(id), medication_id uuid not null references public.clinic_medications(id),
  event_type text not null check (event_type in ('RECEIPT','DISPENSE','RETURN','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','EXPIRED','WASTE')),
  quantity numeric(14,3) not null, reference_id uuid, actor_staff_id uuid not null, event_data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.clinic_external_pharmacy_inventory_events (
  id uuid primary key default gen_random_uuid(), location_id uuid not null references public.clinic_external_pharmacy_locations(id),
  lot_id uuid references public.clinic_external_pharmacy_stock_lots(id), medication_id uuid not null references public.clinic_medications(id),
  event_type text not null check (event_type in ('RECEIPT','DISPENSE','RETURN','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','EXPIRED','WASTE')),
  quantity numeric(14,3) not null, reference_id uuid, actor_staff_id uuid not null, event_data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists idx_internal_pharmacy_stock on public.clinic_internal_pharmacy_stock_lots(location_id, medication_id, expiry_date);
create index if not exists idx_external_pharmacy_stock on public.clinic_external_pharmacy_stock_lots(location_id, medication_id, expiry_date);
create index if not exists idx_internal_pharmacy_orders on public.clinic_internal_pharmacy_orders(patient_id, created_at desc);
create index if not exists idx_external_pharmacy_prescriptions on public.clinic_external_pharmacy_prescriptions(patient_id, created_at desc);
create index if not exists idx_internal_pharmacy_events on public.clinic_internal_pharmacy_events(created_at desc);
create index if not exists idx_external_pharmacy_events on public.clinic_external_pharmacy_events(created_at desc);
