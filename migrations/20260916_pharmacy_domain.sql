-- AZAAD Pharmacy: internal (hospital) + external (outpatient/retail) pharmacy
create extension if not exists pgcrypto;

create table if not exists public.clinic_pharmacy_locations (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  pharmacy_type text not null check (pharmacy_type in ('INTERNAL','EXTERNAL')),
  active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.clinic_medications (
  id uuid primary key default gen_random_uuid(), generic_name text not null, brand_name text,
  strength text, dosage_form text, route text, controlled boolean not null default false,
  formulary_status text not null default 'ACTIVE' check (formulary_status in ('ACTIVE','RESTRICTED','NON_FORMULARY','INACTIVE')),
  external_sellable boolean not null default true, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.clinic_pharmacy_stock_lots (
  id uuid primary key default gen_random_uuid(), location_id uuid not null references public.clinic_pharmacy_locations(id),
  medication_id uuid not null references public.clinic_medications(id), lot_number text not null,
  expiry_date date, quantity numeric(14,3) not null default 0 check (quantity >= 0), unit_cost numeric(14,4),
  supplier text, active boolean not null default true, created_at timestamptz not null default now(),
  unique(location_id, medication_id, lot_number)
);

create table if not exists public.clinic_medication_orders (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null, encounter_id uuid,
  source text not null check (source in ('OUTPATIENT','INPATIENT','ED','OR','ICU','EXTERNAL_PRESCRIPTION')),
  prescriber_staff_id uuid, status text not null default 'ORDERED' check (status in ('ORDERED','VERIFIED','PARTIALLY_DISPENSED','DISPENSED','CANCELLED','HELD')),
  priority text not null default 'ROUTINE' check (priority in ('STAT','URGENT','ROUTINE')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.clinic_medication_order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.clinic_medication_orders(id) on delete cascade,
  medication_id uuid not null references public.clinic_medications(id), dose text, frequency text, route text,
  duration text, quantity_requested numeric(14,3) not null default 1 check (quantity_requested > 0),
  quantity_dispensed numeric(14,3) not null default 0 check (quantity_dispensed >= 0), instructions text
);

create table if not exists public.clinic_pharmacy_dispenses (
  id uuid primary key default gen_random_uuid(), order_id uuid references public.clinic_medication_orders(id),
  order_item_id uuid references public.clinic_medication_order_items(id), patient_id uuid not null,
  location_id uuid not null references public.clinic_pharmacy_locations(id), lot_id uuid references public.clinic_pharmacy_stock_lots(id),
  quantity numeric(14,3) not null check (quantity > 0), dispensed_by uuid not null, status text not null default 'DISPENSED'
    check (status in ('DISPENSED','REVERSED','RETURNED')), dispensed_at timestamptz not null default now()
);

create table if not exists public.clinic_pharmacy_inventory_events (
  id uuid primary key default gen_random_uuid(), location_id uuid not null references public.clinic_pharmacy_locations(id),
  lot_id uuid references public.clinic_pharmacy_stock_lots(id), medication_id uuid not null references public.clinic_medications(id),
  event_type text not null check (event_type in ('RECEIPT','DISPENSE','RETURN','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','EXPIRED','WASTE')),
  quantity numeric(14,3) not null, reference_id uuid, actor_staff_id uuid not null, event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_medication_reconciliation (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null, encounter_id uuid,
  medication_id uuid references public.clinic_medications(id), action text not null check (action in ('CONTINUE','START','STOP','CHANGE','HOLD','UNKNOWN')),
  source text not null, notes text, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.clinic_pharmacy_events (
  id uuid primary key default gen_random_uuid(), actor_staff_id uuid not null, patient_id uuid, order_id uuid,
  event_type text not null, event_data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists idx_pharmacy_stock_location_med on public.clinic_pharmacy_stock_lots(location_id, medication_id);
create index if not exists idx_med_orders_patient on public.clinic_medication_orders(patient_id, created_at desc);
create index if not exists idx_med_order_items_order on public.clinic_medication_order_items(order_id);
create index if not exists idx_pharmacy_dispenses_patient on public.clinic_pharmacy_dispenses(patient_id, dispensed_at desc);
create index if not exists idx_pharmacy_events_created on public.clinic_pharmacy_events(created_at desc);
