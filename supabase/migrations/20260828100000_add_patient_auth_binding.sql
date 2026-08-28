alter table public.clinic_patients add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists clinic_patients_auth_user_id_uidx on public.clinic_patients(auth_user_id) where auth_user_id is not null;
create index if not exists clinic_patients_email_lower_idx on public.clinic_patients(lower(patient_email)) where patient_email is not null;
comment on column public.clinic_patients.auth_user_id is 'Verified Supabase Auth identity bound to exactly one patient record; populated only by the patient portal identity-claim boundary.';
