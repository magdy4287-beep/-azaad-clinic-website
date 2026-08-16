-- Azaad Clinic doctor identity integrity
-- One active staff account may represent a doctor at a time.
-- doctor_id must always point to a real clinic_doctors row.

create unique index if not exists clinic_staff_active_doctor_unique
on public.clinic_staff (doctor_id)
where active = true and doctor_id is not null;

alter table public.clinic_staff
  drop constraint if exists clinic_staff_doctor_fk;

alter table public.clinic_staff
  add constraint clinic_staff_doctor_fk
  foreign key (doctor_id) references public.clinic_doctors(id)
  on update cascade
  on delete set null;
